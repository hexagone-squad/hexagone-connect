import { describe, expect, it } from 'vitest';
import {
  parsePrEvidence,
  validatePrEvidence,
  type PrImplementationLoopEvidence,
} from '../../scripts/check-pr-implementation-loop.js';

const steps = [
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

function evidence(): PrImplementationLoopEvidence {
  return {
    schemaVersion: 1,
    changeId: 'pr-evidence-test',
    changeType: 'governance',
    changedFiles: ['scripts/check-pr-implementation-loop.ts'],
    implementationStartedAt: '2026-08-13T01:00:00Z',
    steps: Object.fromEntries(
      steps.map((step, index) => [
        step,
        {
          status: 'passed',
          timestamp:
            step === 'implementation'
              ? '2026-08-13T01:00:00Z'
              : index < 4
                ? '2026-08-13T00:00:00Z'
                : '2026-08-13T02:00:00Z',
          detail: `Completed ${step}.`,
        },
      ]),
    ) as PrImplementationLoopEvidence['steps'],
  };
}

describe('PR implementation-loop evidence', () => {
  it('accepts a complete declaration matching the final diff', () => {
    expect(() =>
      validatePrEvidence(evidence(), {
        changedFiles: ['scripts/check-pr-implementation-loop.ts'],
        diffHash: 'final-diff-hash',
      }),
    ).not.toThrow();
  });

  it('rejects evidence that does not match the final diff', () => {
    expect(() =>
      validatePrEvidence(evidence(), {
        changedFiles: ['package.json'],
        diffHash: 'final-diff-hash',
      }),
    ).toThrow('changedFiles');
  });

  it('rejects a missing PR-description declaration', () => {
    expect(() => parsePrEvidence('No declaration here.')).toThrow('missing');
  });

  it('rejects BEFORE evidence recorded after implementation', () => {
    const item = evidence();
    item.steps['before-evidence'].timestamp = '2026-08-13T02:00:00Z';
    expect(() =>
      validatePrEvidence(item, {
        changedFiles: ['scripts/check-pr-implementation-loop.ts'],
        diffHash: 'final-diff-hash',
      }),
    ).toThrow('before-evidence');
  });

  it('rejects a non-trivial exemption', () => {
    const item = evidence();
    item.steps.tests.status = 'not applicable';
    expect(() =>
      validatePrEvidence(item, {
        changedFiles: ['scripts/check-pr-implementation-loop.ts'],
        diffHash: 'final-diff-hash',
      }),
    ).toThrow('cannot be exempted');
  });
});
