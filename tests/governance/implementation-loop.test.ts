import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateImplementationLoopManifest } from '../../scripts/check-implementation-loop.js';

const steps = [
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
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const stable = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(stable).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value as Record<string, unknown>)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'implementation-loop-'));
  mkdirSync(join(root, 'evidence'), { recursive: true });
  const write = (path: string, content: string) => {
    const absolute = join(root, path);
    writeFileSync(absolute, content);
    return { path, content };
  };
  const before = write('evidence/before.json', '{"state":"before"}\n');
  const after = write('evidence/after.json', '{"state":"after"}\n');
  const audit = write(
    'evidence/audit.json',
    '{"tool":"diff-audit","command":"pnpm check:governance","exitCode":0,"result":"passed","diffHash":"diff-hash","checkedFiles":["services/example/src/index.ts"]}\n',
  );
  const review = write(
    'evidence/review.json',
    '{"tool":"automated-review","command":"pnpm lint","exitCode":0,"result":"passed","diffHash":"diff-hash","checkedFiles":["services/example/src/index.ts"]}\n',
  );
  const proofPath = 'evidence/pr-proof.json';
  const contentMeta = (
    file: { path: string; content: string },
    phase: 'before' | 'after' | 'report',
  ) => ({
    path: file.path,
    phase,
    sha256: sha(file.content),
    bytes: Buffer.byteLength(file.content),
    capturedAt: phase === 'before' ? '2026-08-13T00:00:00Z' : '2026-08-13T02:00:00Z',
    scenarioId: 'scenario-1',
    invocation: 'pnpm test -- focused',
    environment: 'node-test',
    observable: 'focused-test-output',
    sourceRevision: phase === 'before' ? 'baseline-revision' : 'final-revision',
  });
  const manifest = {
    schemaVersion: 1,
    changeId: 'change-1',
    changeType: 'service',
    changedFiles: ['services/example/src/index.ts'],
    relevantFiles: ['services/example/src/index.ts'],
    relevantFilesHash: 'source-hash',
    applicableSteps: [...steps],
    exemptedSteps: [],
    trivialExemption: undefined,
    implementationStartedAt: '2026-08-13T01:00:00Z',
    stepTimestamps: {
      specification: '2026-08-13T00:00:00Z',
      tests: '2026-08-13T00:00:00Z',
      'focused-failure': '2026-08-13T00:00:00Z',
      'before-evidence': '2026-08-13T00:00:00Z',
      implementation: '2026-08-13T01:00:00Z',
      verification: '2026-08-13T02:00:00Z',
      'after-evidence': '2026-08-13T02:00:00Z',
      documentation: '2026-08-13T02:00:00Z',
      'diff-audit': '2026-08-13T03:00:00Z',
      'automated-review': '2026-08-13T03:00:00Z',
      'pr-proof': '2026-08-13T03:00:00Z',
    },
    commands: [
      {
        name: 'focused',
        invocation: 'pnpm test -- focused',
        exitCode: 1,
        startedAt: '2026-08-13T00:00:00Z',
        finishedAt: '2026-08-13T00:00:01Z',
        scenarioId: 'scenario-1',
        environment: 'node-test',
        result: 'failed' as const,
      },
      {
        name: 'focused',
        invocation: 'pnpm test -- focused',
        exitCode: 0,
        startedAt: '2026-08-13T02:00:00Z',
        finishedAt: '2026-08-13T02:00:01Z',
        scenarioId: 'scenario-1',
        environment: 'node-test',
        result: 'passed' as const,
      },
    ],
    beforeArtifacts: [contentMeta(before, 'before')],
    afterArtifacts: [contentMeta(after, 'after')],
    focusedTest: {
      scenarioId: 'scenario-1',
      invocation: 'pnpm test -- focused',
      environment: 'node-test',
      before: {
        result: 'failed' as const,
        command: 'pnpm test -- focused',
        exitCode: 1,
        capturedAt: '2026-08-13T00:00:00Z',
      },
      after: {
        result: 'passed' as const,
        command: 'pnpm test -- focused',
        exitCode: 0,
        capturedAt: '2026-08-13T02:00:00Z',
      },
    },
    fullVerification: {
      command: 'pnpm build:ci',
      exitCode: 0,
      result: 'passed' as const,
      scenarioId: 'scenario-1',
      environment: 'node-test',
      capturedAt: '2026-08-13T03:00:00Z',
    },
    diffAudit: { path: audit.path, diffHash: 'diff-hash' },
    independentReview: { path: review.path, diffHash: 'diff-hash' },
    prProof: { path: proofPath, checked: true as const, manifestHash: '', diffHash: 'diff-hash' },
    finalReviewedDiffHash: 'diff-hash',
  };
  const canonical = () => {
    const copy = JSON.parse(JSON.stringify(manifest)) as typeof manifest;
    copy.prProof.manifestHash = '';
    return sha(stable(copy));
  };
  writeFileSync(
    join(root, proofPath),
    JSON.stringify({ checked: true, manifestHash: canonical(), diffHash: 'diff-hash' }),
  );
  manifest.prProof.manifestHash = canonical();
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  return { root, path: 'manifest.json', manifest, before, after };
}

function valid() {
  const item = fixture();
  validateImplementationLoopManifest(item.path, {
    repositoryRoot: item.root,
    finalDiffHash: 'diff-hash',
    currentSourceHash: 'source-hash',
    changedFiles: item.manifest.changedFiles,
  });
  return item;
}
function rejects(mutator: (item: ReturnType<typeof fixture>) => void, message: string) {
  const item = fixture();
  mutator(item);
  if (item.manifest.prProof.path !== 'missing-proof.json') {
    const copy = JSON.parse(JSON.stringify(item.manifest)) as typeof item.manifest;
    copy.prProof.manifestHash = '';
    const canonical = sha(stable(copy));
    item.manifest.prProof.manifestHash = canonical;
    writeFileSync(
      join(item.root, item.manifest.prProof.path),
      JSON.stringify({
        checked: true,
        manifestHash: canonical,
        diffHash: item.manifest.finalReviewedDiffHash,
      }),
    );
  }
  writeFileSync(join(item.root, item.path), JSON.stringify(item.manifest));
  expect(() =>
    validateImplementationLoopManifest(item.path, {
      repositoryRoot: item.root,
      finalDiffHash: 'diff-hash',
      currentSourceHash: 'source-hash',
    }),
  ).toThrow(message);
}

describe('implementation loop evidence', () => {
  it('passes a complete valid workflow', () => {
    valid();
  });
  it('rejects missing BEFORE evidence', () =>
    rejects((item) => {
      item.manifest.beforeArtifacts = [];
    }, '[before-evidence]'));
  it('rejects BEFORE evidence captured after implementation', () =>
    rejects((item) => {
      item.manifest.beforeArtifacts[0].capturedAt = '2026-08-13T02:00:00Z';
    }, '[before-evidence]'));
  it('rejects different BEFORE and AFTER invocations', () =>
    rejects((item) => {
      item.manifest.afterArtifacts[0].invocation = 'different';
    }, '[after-evidence]'));
  it('rejects missing artifacts', () =>
    rejects((item) => {
      item.manifest.afterArtifacts[0].path = 'missing.json';
    }, 'artifact does not exist'));
  it('rejects a focused test without a pre-fix failure', () =>
    rejects((item) => {
      item.manifest.focusedTest.before.exitCode = 0;
    }, '[focused-failure]'));
  it('rejects a stale audit diff hash', () =>
    rejects((item) => {
      item.manifest.diffAudit.diffHash = 'stale';
    }, '[diff-audit]'));
  it('rejects a stale automated review diff hash', () =>
    rejects((item) => {
      item.manifest.independentReview.diffHash = 'stale';
    }, '[automated-review]'));
  it('rejects missing PR proof', () =>
    rejects((item) => {
      item.manifest.prProof.path = 'missing-proof.json';
    }, '[pr-proof]'));
  it('rejects an invalid trivial exemption', () =>
    rejects((item) => {
      item.manifest.changeType = 'trivial-production';
      item.manifest.trivialExemption = undefined;
    }, '[manifest]'));
  it('rejects source changes after evidence capture', () =>
    rejects((item) => {
      item.manifest.relevantFilesHash = 'old-source-hash';
    }, '[manifest]'));
  it('rejects unrelated command output', () =>
    rejects((item) => {
      item.manifest.focusedTest.invocation = 'pnpm another-command-output';
    }, '[verification]'));
});
