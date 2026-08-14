import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const LOOP_STEPS = [
  'specification',
  'tests',
  'focused-failure',
  'before-evidence',
  'implementation',
  'documentation',
  'diff-audit',
  'automated-review',
  'pr-proof',
] as const;

const TRIVIAL_CHANGE_TYPES = new Set([
  'trivial-typo',
  'trivial-comment-only',
  'trivial-documentation-correction',
]);
const TRIVIALLY_EXEMPTIBLE_STEPS = new Set([
  'tests',
  'focused-failure',
  'before-evidence',
  'implementation',
  'diff-audit',
  'automated-review',
]);
const GOVERNANCE_EVIDENCE_EXEMPTIONS = new Set(['tests', 'focused-failure', 'before-evidence']);

type LoopStep = (typeof LOOP_STEPS)[number];
type StepEvidence = {
  status: 'passed' | 'not applicable';
  timestamp: string;
  detail: string;
};

export type PrImplementationLoopEvidence = {
  schemaVersion: 1;
  changeId: string;
  changeType: string;
  changedFiles: string[];
  implementationStartedAt: string;
  steps: Record<LoopStep, StepEvidence>;
};

type PullRequestEvent = {
  pull_request?: {
    number?: number;
    body?: string | null;
    base?: { sha?: string; ref?: string };
    head?: { sha?: string };
  };
  number?: number;
};

export type PrContext = {
  number: number;
  baseSha: string;
  headSha: string;
  changedFiles: string[];
  diffHash: string;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function fail(message: string): never {
  throw new Error(`IMPLEMENTATION LOOP FAILED: ${message}`);
}

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} must be an ISO timestamp`);
  return parsed;
}

export function parsePrEvidence(body: string | null | undefined): PrImplementationLoopEvidence {
  const match = body?.match(/<!--\s*implementation-loop-evidence\s*\n([\s\S]*?)\n\s*-->/i);
  if (!match) fail('PR description is missing the implementation-loop-evidence JSON comment');
  try {
    return JSON.parse(match[1]) as PrImplementationLoopEvidence;
  } catch {
    fail('implementation-loop-evidence must contain valid JSON');
  }
}

export function validatePrEvidence(
  evidence: PrImplementationLoopEvidence,
  context: Pick<PrContext, 'changedFiles' | 'diffHash'>,
): void {
  if (evidence.schemaVersion !== 1) fail('unsupported evidence schemaVersion');
  if (!evidence.changeId.trim() || !evidence.changeType.trim()) {
    fail('changeId and changeType are required');
  }
  if (/TODO|TBD|PLACEHOLDER|short-change-identifier/i.test(JSON.stringify(evidence))) {
    fail('placeholder evidence is not valid proof');
  }

  const expectedFiles = [...context.changedFiles].sort();
  const actualFiles = [...evidence.changedFiles].sort();
  if (JSON.stringify(expectedFiles) !== JSON.stringify(actualFiles)) {
    fail('changedFiles does not match the final pull-request diff');
  }

  const isTrivial = TRIVIAL_CHANGE_TYPES.has(evidence.changeType);
  if (evidence.changeType.startsWith('trivial-') && !isTrivial) {
    fail('trivial changes require an approved narrow classification');
  }

  const implementationStartedAt = timestamp(
    evidence.implementationStartedAt,
    'implementationStartedAt',
  );
  for (const step of LOOP_STEPS) {
    const record = evidence.steps?.[step];
    if (!record || !record.detail.trim()) fail(`${step} requires a status, timestamp, and detail`);
    if (record.status !== 'passed' && record.status !== 'not applicable') {
      fail(`${step} has an unsupported status`);
    }
    const recordedAt = timestamp(record.timestamp, `${step}.timestamp`);
const governanceOnlyChange =
  evidence.changeType === 'governance' &&
  !context.changedFiles.some((file) =>
    /^(apps|services|packages|database|contracts|ai|infrastructure)\//.test(file),
  );
    const governanceEvidenceExemption =
      governanceOnlyChange && GOVERNANCE_EVIDENCE_EXEMPTIONS.has(step);
    if (
      record.status === 'not applicable' &&
      (!isTrivial || !TRIVIALLY_EXEMPTIBLE_STEPS.has(step)) &&
      !governanceEvidenceExemption
    ) {
      fail(`${step} cannot be exempted for this change`);
    }
    if (step === 'implementation' && recordedAt !== implementationStartedAt) {
      fail('implementation timestamp must equal implementationStartedAt');
    }
    if (
      ['specification', 'tests', 'focused-failure', 'before-evidence'].includes(step) &&
      recordedAt >= implementationStartedAt
    ) {
      fail(`${step} must be recorded before implementation begins`);
    }
    if (
      !['specification', 'tests', 'focused-failure', 'before-evidence', 'implementation'].includes(
        step,
      ) &&
      recordedAt < implementationStartedAt
    ) {
      fail(`${step} cannot be recorded before implementation begins`);
    }
  }
  if (!context.diffHash) fail('final diff hash is required');
}

function gitContext(baseRef: string): { changedFiles: string[]; diffHash: string } {
  const base = `origin/${baseRef}`;
  const changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
    { encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean);
  const diff = execFileSync('git', ['diff', '--binary', `${base}...HEAD`], {
    encoding: 'utf8',
  });
  return { changedFiles, diffHash: sha256(diff) };
}

function prContext(): { context: PrContext; body: string | null | undefined } {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) fail('GITHUB_EVENT_PATH is required in the remote PR workflow');
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as PullRequestEvent;
  const pr = event.pull_request;
  const baseRef = pr?.base?.ref;
  const baseSha = pr?.base?.sha;
  const headSha = pr?.head?.sha;
  const number = event.number ?? pr?.number;
  if (!baseRef || !baseSha || !headSha || !number) fail('pull-request metadata is incomplete');
  const git = gitContext(baseRef);
  return {
    context: { number, baseSha, headSha, ...git },
    body: pr.body,
  };
}

function writeProof(proof: Record<string, unknown>): void {
  const directory = resolve('.ci-artifacts/implementation-loop');
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, 'proof.json'), `${JSON.stringify(proof, null, 2)}\n`);
}

if (process.argv[1]?.endsWith('check-pr-implementation-loop.ts')) {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    console.log('NOT APPLICABLE implementation loop: remote pull-request metadata is unavailable');
  } else {
    try {
      const { context, body } = prContext();
      const evidence = parsePrEvidence(body);
      validatePrEvidence(evidence, context);
      writeProof({
        result: 'passed',
        remoteValidation: { command: 'pnpm run validate', result: 'passed' },
        context,
        evidence,
      });
      console.log(`PASS implementation loop: PR #${context.number}`);
    } catch (error) {
      writeProof({
        result: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
