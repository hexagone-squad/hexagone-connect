import { describe, expect, it } from 'vitest';
import {
  buildWowPlan,
  parseWowArgs,
  type WowArgs,
  type WowRuntimeState,
} from '../../scripts/workflow-wow-lib.js';

function args(input: string[]): WowArgs {
  return parseWowArgs(input);
}

function baseState(overrides: Partial<WowRuntimeState> = {}): WowRuntimeState {
  const defaultConversation = {
    exchangesWithoutStep: 0,
    repeatedInvestigationWithoutProgress: false,
    declaredCompleteWithoutVerification: false,
    freshConversation: false,
    exploratoryOnlyRequest: false,
  };
  const defaultPrerequisites = {
    hasGit: true,
    hasPnpm: true,
    hasGh: true,
    ghAuthenticated: true,
    testEnvironmentReady: true,
    uiCaptureReady: true,
  };

  const state: WowRuntimeState = {
    editedFiles: [],
    taskBranch: 'main',
    commandEvidence: [],
    artifacts: [],
    conversation: defaultConversation,
    prerequisites: defaultPrerequisites,
    hardRuleViolation: false,
    irreversibleOperationRequested: false,
    auditFindingsRequireJudgment: false,
    reviewFindingsRequireJudgment: false,
  };

  Object.assign(state, overrides);
  state.conversation = { ...defaultConversation, ...(overrides.conversation ?? {}) };
  state.prerequisites = { ...defaultPrerequisites, ...(overrides.prerequisites ?? {}) };
  return state;
}

describe('/wow argument parsing', () => {
  it('supports /wow with no arguments', () => {
    expect(args([])).toEqual({
      accept: false,
      taskName: undefined,
      stateFile: undefined,
      outputJson: false,
    });
  });

  it('supports /wow --accept <task-name>', () => {
    expect(args(['--accept', 'tighten', 'governance'])).toEqual({
      accept: true,
      taskName: 'tighten governance',
      stateFile: undefined,
      outputJson: false,
    });
  });
});

describe('/wow behavioral scenarios', () => {
  it('fresh task without --accept requires explicit confirmation', () => {
    const plan = buildWowPlan(baseState(), args(['new task']));
    expect(plan.acceptMode.effective).toBe(false);
    expect(plan.nextAction).toContain('Re-run with /wow --accept');
  });

  it('existing work with explicit --accept starts earliest incomplete step', () => {
    const plan = buildWowPlan(
      baseState({
        taskBranch: 'feat/wow',
        editedFiles: ['docs/development.md', 'tests/governance/setup-contract.test.ts'],
      }),
      args(['--accept', 'harden workflow']),
    );

    expect(plan.acceptMode.effective).toBe(true);
    expect(plan.nextAction).toContain('Start focused-failure');
  });

  it('auto-detects accept mode when strong established-work signals exist', () => {
    const plan = buildWowPlan(
      baseState({
        taskBranch: 'feat/wow',
        editedFiles: [
          'services/work-management/src/composition-root.ts',
          'docs/development.md',
          'tests/governance/setup-contract.test.ts',
        ],
        commandEvidence: [
          { command: 'pnpm run test:unit', exitCode: 1, phase: 'before' },
          { command: 'pnpm run test:unit', exitCode: 0, phase: 'after' },
          { command: 'pnpm run validate', exitCode: 0, phase: 'verification' },
        ],
        artifacts: [
          { name: 'before-proof', phase: 'before', category: 'ci-build-config-docs' },
          { name: 'after-proof', phase: 'after', category: 'ci-build-config-docs' },
          { name: 'summary', phase: 'summary', category: 'ci-build-config-docs' },
        ],
      }),
      args(['workflow hardening']),
    );

    expect(plan.acceptMode.autoDetected).toBe(true);
    expect(plan.acceptMode.effective).toBe(true);
  });

  it('blocks on missing authentication in preflight', () => {
    const plan = buildWowPlan(
      baseState({
        prerequisites: {
          hasGit: true,
          hasPnpm: true,
          hasGh: true,
          ghAuthenticated: false,
          testEnvironmentReady: true,
          uiCaptureReady: true,
        },
      }),
      args(['--accept', 'run task']),
    );

    expect(plan.preflight.ok).toBe(false);
    expect(plan.blockers.some((item) => item.code === 'missing-prerequisite')).toBe(true);
    expect(plan.nextAction).toContain('Stop');
  });

  it('marks late-before when implementation happened before BEFORE evidence', () => {
    const plan = buildWowPlan(
      baseState({
        editedFiles: ['services/work-management/src/composition-root.ts'],
        artifacts: [{ name: 'late-before', phase: 'late-before', category: 'api-server-data' }],
      }),
      args(['--accept', 'repair ordering']),
    );

    const beforeStep = plan.checklist.find((step) => step.id === 'before-evidence');
    expect(beforeStep?.status).toBe('late-before-required');
    expect(plan.limitations.some((item) => item.includes('late-before'))).toBe(true);
  });

  it('docs-only changes use non-UI evidence classification', () => {
    const plan = buildWowPlan(
      baseState({ editedFiles: ['docs/development.md', 'docs/governance.md'] }),
      args(['--accept', 'docs correction']),
    );

    expect(plan.evidenceClasses).toContain('ci-build-config-docs');
    expect(plan.evidenceClasses).not.toContain('ui');
  });

  it('blocks ambiguous task name when no task and no in-scope edits are present', () => {
    const plan = buildWowPlan(baseState({ editedFiles: [] }), args(['--accept']));
    expect(plan.taskName).toBe('UNRESOLVED');
    expect(plan.blockers.some((item) => item.code === 'ambiguous-task')).toBe(true);
  });

  it('stops mid-loop when audit findings require judgment', () => {
    const plan = buildWowPlan(
      baseState({
        editedFiles: ['docs/development.md', 'tests/governance/setup-contract.test.ts'],
        auditFindingsRequireJudgment: true,
      }),
      args(['--accept', 'stabilize process']),
    );

    expect(plan.blockers.some((item) => item.code === 'audit-judgment-required')).toBe(true);
    expect(plan.nextAction).toContain('Stop');
  });

  it('refuses to skip BEFORE evidence even when validation already passed', () => {
    const plan = buildWowPlan(
      baseState({
        editedFiles: ['services/work-management/src/composition-root.ts'],
        commandEvidence: [
          { command: 'pnpm run test:unit', exitCode: 0, phase: 'after' },
          { command: 'pnpm run validate', exitCode: 0, phase: 'verification' },
        ],
      }),
      args(['--accept', 'finalize service update']),
    );

    const validationStep = plan.checklist.find((step) => step.id === 'validation');
    const beforeStep = plan.checklist.find((step) => step.id === 'before-evidence');

    expect(beforeStep?.status === 'blocked' || beforeStep?.status === 'late-before-required').toBe(
      true,
    );
    expect(validationStep?.status).toBe('blocked');
    expect(plan.blockers.some((item) => item.code === 'ordering-violation')).toBe(true);
  });
});
