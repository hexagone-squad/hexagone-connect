import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export const LOOP_STEPS = [
  'specification',
  'tests',
  'focused-failure',
  'before-evidence',
  'implementation',
  'verification',
  'after-evidence',
  'documentation',
  'diff-audit',
  'automated-review',
  'pr-proof',
] as const;

type LoopStep = (typeof LOOP_STEPS)[number];

type Artifact = {
  path: string;
  phase: 'before' | 'after' | 'report';
  sha256: string;
  bytes: number;
  capturedAt: string;
  scenarioId: string;
  invocation: string;
  environment: string;
  observable: string;
  sourceRevision: string;
};

type CommandEvidence = {
  name: string;
  invocation: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
  scenarioId: string;
  environment: string;
  result: 'passed' | 'failed';
};

export type LoopManifest = {
  schemaVersion: 1;
  changeId: string;
  changeType: string;
  changedFiles: string[];
  relevantFiles: string[];
  relevantFilesHash: string;
  applicableSteps: LoopStep[];
  exemptedSteps: Array<{ step: LoopStep; justification: string }>;
  trivialExemption?: {
    classification: 'typo' | 'comment-only' | 'documentation-correction';
    justification: string;
  };
  implementationStartedAt: string;
  stepTimestamps: Record<LoopStep, string>;
  commands: CommandEvidence[];
  beforeArtifacts: Artifact[];
  afterArtifacts: Artifact[];
  focusedTest: {
    scenarioId: string;
    invocation: string;
    environment: string;
    before: { result: 'failed'; command: string; exitCode: number; capturedAt: string };
    after: { result: 'passed'; command: string; exitCode: number; capturedAt: string };
  };
  fullVerification: {
    command: string;
    exitCode: number;
    result: 'passed';
    scenarioId: string;
    environment: string;
    capturedAt: string;
  };
  diffAudit: { path: string; diffHash: string };
  independentReview: { path: string; diffHash: string };
  prProof: { path: string; checked: true; manifestHash: string; diffHash: string };
  finalReviewedDiffHash: string;
};

export type ValidationOptions = {
  changedFiles?: string[];
  finalDiffHash?: string;
  currentSourceHash?: string;
  repositoryRoot?: string;
};

function fail(step: string, manifest: LoopManifest, message: string): never {
  throw new Error(
    `IMPLEMENTATION LOOP FAILED [${step}] changeType=${manifest.changeType}: ${message}. ` +
      `Remediation: update the manifest and referenced evidence, then run pnpm check:implementation-loop.`,
  );
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function manifestHash(manifest: LoopManifest): string {
  const copy = structuredClone(manifest) as LoopManifest;
  copy.prProof.manifestHash = '';
  return sha256(stable(copy));
}

function sourceHash(files: string[], root: string): string {
  return sha256(
    files
      .slice()
      .sort()
      .map((file) => `${file}\0${readFileSync(resolve(root, file))}`)
      .join('\0'),
  );
}

function validateTimestamp(
  step: string,
  manifest: LoopManifest,
  value: string,
  label: string,
): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(step, manifest, `${label} is not an ISO timestamp`);
  return timestamp;
}

function validateArtifact(
  step: string,
  manifest: LoopManifest,
  artifact: Artifact,
  root: string,
): void {
  const path = resolve(root, artifact.path);
  if (!existsSync(path) || !statSync(path).isFile())
    fail(step, manifest, `artifact does not exist: ${artifact.path}`);
  const content = readFileSync(path);
  if (
    content.length === 0 ||
    artifact.bytes !== content.length ||
    artifact.sha256 !== sha256(content)
  ) {
    fail(step, manifest, `artifact is empty or hash/size metadata is incorrect: ${artifact.path}`);
  }
  validateTimestamp(step, manifest, artifact.capturedAt, `${artifact.path}.capturedAt`);
  if (
    !artifact.scenarioId ||
    !artifact.invocation ||
    !artifact.environment ||
    !artifact.observable ||
    !artifact.sourceRevision
  ) {
    fail(
      step,
      manifest,
      `artifact lacks scenario, invocation, environment, or source revision: ${artifact.path}`,
    );
  }
}

function validateManifest(manifest: LoopManifest, options: ValidationOptions = {}): void {
  const root = options.repositoryRoot ?? process.cwd();
  if (manifest.schemaVersion !== 1) fail('manifest', manifest, 'unsupported schemaVersion');
  if (!manifest.changeId || !manifest.changeType || manifest.changedFiles.length === 0) {
    fail('manifest', manifest, 'changeId, changeType, and changedFiles are required');
  }
  if (/TODO|TBD|PLACEHOLDER|lorem ipsum|unrelated-log/i.test(stable(manifest))) {
    fail('manifest', manifest, 'placeholder or unrelated evidence text is not valid proof');
  }
  if (manifest.commands.length === 0)
    fail('manifest', manifest, 'at least one exact command record is required');
  for (const command of manifest.commands) {
    if (
      !command.name ||
      !command.invocation ||
      !command.scenarioId ||
      !command.environment ||
      !Number.isInteger(command.exitCode) ||
      (command.result === 'passed' && command.exitCode !== 0) ||
      (command.result === 'failed' && command.exitCode === 0)
    ) {
      fail(
        'manifest',
        manifest,
        'every command record requires an exact invocation, scenario, environment, exit code, and consistent result',
      );
    }
  }

  const exempted = new Set(manifest.exemptedSteps.map((entry) => entry.step));
  const applicable = new Set(manifest.applicableSteps);
  for (const step of LOOP_STEPS) {
    if (exempted.has(step) === applicable.has(step)) {
      fail(step, manifest, 'each step must be exactly applicable or exempted');
    }
  }
  if (manifest.exemptedSteps.some((entry) => !entry.justification.trim())) {
    fail('manifest', manifest, 'every exemption requires a justification');
  }

  if (manifest.changeType.startsWith('trivial-')) {
    const allowed = new Set<LoopStep>([
      'tests',
      'focused-failure',
      'before-evidence',
      'implementation',
      'verification',
      'after-evidence',
      'diff-audit',
      'automated-review',
    ]);
    if (
      !manifest.trivialExemption ||
      !['typo', 'comment-only', 'documentation-correction'].includes(
        manifest.trivialExemption.classification,
      )
    ) {
      fail('manifest', manifest, 'trivial changes require a valid narrow exemption classification');
    }
    for (const step of exempted)
      if (!allowed.has(step)) fail(step, manifest, 'step cannot be exempted for a trivial change');
  } else if (exempted.size > 0) {
    fail('manifest', manifest, 'non-trivial changes cannot use trivial exemptions');
  }

  const implementationStarted = validateTimestamp(
    'implementation',
    manifest,
    manifest.implementationStartedAt,
    'implementationStartedAt',
  );
  for (const step of manifest.applicableSteps) {
    const timestamp = validateTimestamp(
      step,
      manifest,
      manifest.stepTimestamps[step],
      `${step}.timestamp`,
    );
    if (step === 'implementation' && timestamp !== implementationStarted)
      fail(step, manifest, 'implementation timestamp must equal implementationStartedAt');
    if (
      ['specification', 'tests', 'focused-failure', 'before-evidence'].includes(step) &&
      timestamp >= implementationStarted
    )
      fail(step, manifest, 'steps 1–4 must be completed before implementation');
    if (
      !['specification', 'tests', 'focused-failure', 'before-evidence', 'implementation'].includes(
        step,
      ) &&
      timestamp < implementationStarted
    )
      fail(step, manifest, 'post-implementation step has an earlier timestamp');
  }
  const before = manifest.beforeArtifacts;
  const after = manifest.afterArtifacts;
  for (const artifact of before) validateArtifact('before-evidence', manifest, artifact, root);
  for (const artifact of after) validateArtifact('after-evidence', manifest, artifact, root);
  if (before.length === 0 && applicable.has('before-evidence'))
    fail('before-evidence', manifest, 'no BEFORE artifacts are registered');
  if (after.length === 0 && applicable.has('after-evidence'))
    fail('after-evidence', manifest, 'no AFTER artifacts are registered');

  for (const beforeArtifact of before) {
    if (
      validateTimestamp(
        'before-evidence',
        manifest,
        beforeArtifact.capturedAt,
        'before capturedAt',
      ) >= implementationStarted
    ) {
      fail(
        'before-evidence',
        manifest,
        `BEFORE evidence was captured after implementation: ${beforeArtifact.path}`,
      );
    }
  }
  for (const afterArtifact of after) {
    if (
      validateTimestamp('after-evidence', manifest, afterArtifact.capturedAt, 'after capturedAt') <=
      implementationStarted
    ) {
      fail(
        'after-evidence',
        manifest,
        `AFTER evidence was captured before implementation: ${afterArtifact.path}`,
      );
    }
  }
  if (before.length && after.length) {
    const firstBefore = before[0];
    const firstAfter = after[0];
    if (
      firstBefore.scenarioId !== firstAfter.scenarioId ||
      firstBefore.invocation !== firstAfter.invocation ||
      firstBefore.environment !== firstAfter.environment ||
      firstBefore.observable !== firstAfter.observable
    ) {
      fail(
        'after-evidence',
        manifest,
        'BEFORE and AFTER scenario, invocation, environment, or observable differ',
      );
    }
  }

  if (applicable.has('focused-failure')) {
    if (
      manifest.focusedTest.before.result !== 'failed' ||
      manifest.focusedTest.before.exitCode === 0
    ) {
      fail('focused-failure', manifest, 'focused BEFORE test must have a non-zero failing result');
    }
    if (
      manifest.focusedTest.after.result !== 'passed' ||
      manifest.focusedTest.after.exitCode !== 0
    ) {
      fail('verification', manifest, 'focused AFTER test must have exitCode 0 and passed result');
    }
    if (manifest.focusedTest.scenarioId === '' || manifest.focusedTest.invocation === '') {
      fail('focused-failure', manifest, 'focused test scenario and invocation are required');
    }
    if (
      manifest.focusedTest.before.command !== manifest.focusedTest.after.command ||
      manifest.focusedTest.invocation !== manifest.focusedTest.before.command
    ) {
      fail('verification', manifest, 'focused BEFORE and AFTER commands differ');
    }
    const focusedCommands = manifest.commands.filter((command) => command.name === 'focused');
    if (
      focusedCommands.length < 2 ||
      focusedCommands.some(
        (command) =>
          command.invocation !== manifest.focusedTest.invocation ||
          command.scenarioId !== manifest.focusedTest.scenarioId ||
          command.environment !== manifest.focusedTest.environment,
      )
    ) {
      fail(
        'focused-failure',
        manifest,
        'focused test evidence does not match a pair of exact command records',
      );
    }
    if (
      validateTimestamp(
        'focused-failure',
        manifest,
        manifest.focusedTest.before.capturedAt,
        'focused BEFORE capturedAt',
      ) >= implementationStarted
    ) {
      fail(
        'focused-failure',
        manifest,
        'focused failing test was captured after implementation started',
      );
    }
  }

  if (
    applicable.has('verification') &&
    (manifest.fullVerification.exitCode !== 0 || manifest.fullVerification.result !== 'passed')
  ) {
    fail('verification', manifest, 'full verification did not pass');
  }
  if (applicable.has('documentation') && manifest.relevantFiles.length === 0) {
    fail('documentation', manifest, 'relevant files are required for documentation verification');
  }
  if (options.currentSourceHash && options.currentSourceHash !== manifest.relevantFilesHash) {
    fail(
      'manifest',
      manifest,
      'relevant files changed after evidence capture; regenerate evidence',
    );
  }
  if (options.changedFiles) {
    const expected = [...options.changedFiles].sort();
    const actual = [...manifest.changedFiles].sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      fail('manifest', manifest, 'manifest changedFiles do not match the final diff');
  }
  if (!manifest.finalReviewedDiffHash)
    fail('diff-audit', manifest, 'finalReviewedDiffHash is required');
  if (options.finalDiffHash && options.finalDiffHash !== manifest.finalReviewedDiffHash) {
    fail(
      'diff-audit',
      manifest,
      'manifest finalReviewedDiffHash does not match the current final diff',
    );
  }
  if (manifest.diffAudit.diffHash !== manifest.finalReviewedDiffHash)
    fail('diff-audit', manifest, 'audit report does not match final reviewed diff hash');
  if (manifest.independentReview.diffHash !== manifest.finalReviewedDiffHash)
    fail('automated-review', manifest, 'automated review does not match final reviewed diff hash');

  for (const report of [manifest.diffAudit, manifest.independentReview]) {
    const reportStep = report.path === manifest.diffAudit.path ? 'diff-audit' : 'automated-review';
    const reportPath = resolve(root, report.path);
    validateArtifact(
      reportStep,
      manifest,
      {
        path: report.path,
        phase: 'report',
        sha256: sha256(readFileSync(reportPath)),
        bytes: statSync(reportPath).size,
        capturedAt: manifest.fullVerification.capturedAt,
        scenarioId: manifest.fullVerification.scenarioId,
        invocation: manifest.fullVerification.command,
        environment: manifest.fullVerification.environment,
        observable: 'review-report',
        sourceRevision: manifest.finalReviewedDiffHash,
      },
      root,
    );
    let structuredReport: {
      tool?: unknown;
      command?: unknown;
      exitCode?: unknown;
      result?: unknown;
      diffHash?: unknown;
      checkedFiles?: unknown;
    };
    try {
      structuredReport = JSON.parse(readFileSync(reportPath, 'utf8')) as typeof structuredReport;
    } catch {
      fail(
        reportStep,
        manifest,
        'audit and review reports must be structured JSON, not arbitrary prose',
      );
    }
    if (
      typeof structuredReport.tool !== 'string' ||
      typeof structuredReport.command !== 'string' ||
      structuredReport.exitCode !== 0 ||
      structuredReport.result !== 'passed' ||
      structuredReport.diffHash !== manifest.finalReviewedDiffHash ||
      !Array.isArray(structuredReport.checkedFiles) ||
      structuredReport.checkedFiles.length === 0
    ) {
      fail(
        reportStep,
        manifest,
        'structured report must record tool, command, exitCode 0, passed result, checked files, and the final diff hash',
      );
    }
  }

  const proofPath = resolve(root, manifest.prProof.path);
  if (!existsSync(proofPath) || statSync(proofPath).size === 0)
    fail('pr-proof', manifest, `PR proof is missing or empty: ${manifest.prProof.path}`);
  const proof = JSON.parse(readFileSync(proofPath, 'utf8')) as {
    checked?: unknown;
    manifestHash?: unknown;
    diffHash?: unknown;
  };
  if (
    proof.checked !== true ||
    proof.manifestHash !== manifestHash(manifest) ||
    proof.diffHash !== manifest.finalReviewedDiffHash ||
    manifest.prProof.checked !== true ||
    manifest.prProof.manifestHash !== manifestHash(manifest)
  ) {
    fail('pr-proof', manifest, 'PR proof does not match the manifest or final diff hash');
  }
}

export function validateImplementationLoopManifest(
  manifestPath: string,
  options: ValidationOptions = {},
): void {
  const root = options.repositoryRoot ?? process.cwd();
  const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8')) as LoopManifest;
  validateManifest(manifest, options);
}

function gitContext(): { changedFiles: string[]; diffHash: string } | undefined {
  try {
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';
    const changedFiles = execFileSync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .split('\n')
      .filter(Boolean);
    const diff = execFileSync('git', ['diff', '--binary', `${base}...HEAD`], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { changedFiles, diffHash: sha256(diff) };
  } catch {
    return undefined;
  }
}

if (process.argv[1]?.endsWith('check-implementation-loop.ts')) {
  const manifestPath = process.argv[2] ?? 'evidence/implementation-loop/manifest.json';
  if (!existsSync(manifestPath)) {
    if (!gitContext()) {
      console.log('NOT APPLICABLE implementation loop: Git metadata and manifest are unavailable');
      process.exit(0);
    }
    throw new Error(
      `IMPLEMENTATION LOOP FAILED [manifest] changeType=unknown: missing manifest ${manifestPath}. Remediation: create the evidence manifest and PR proof.`,
    );
  }
  const context = gitContext();
  if (!context) {
    console.log('NOT APPLICABLE implementation loop: Git metadata is unavailable');
    process.exit(0);
  }
  const manifestForHash = JSON.parse(
    readFileSync(resolve(process.cwd(), manifestPath), 'utf8'),
  ) as LoopManifest;
  validateImplementationLoopManifest(manifestPath, {
    ...context,
    currentSourceHash: sourceHash(
      manifestForHash.relevantFiles.filter((file) => existsSync(file)),
      process.cwd(),
    ),
  });
  console.log(`PASS implementation loop: ${manifestPath}`);
}
