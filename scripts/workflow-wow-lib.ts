export type WowStepStatus =
  'pending' | 'in-progress' | 'completed' | 'blocked' | 'late-before-required';

export type WowStepId =
  | 'specification'
  | 'tests-updated'
  | 'focused-failure'
  | 'before-evidence'
  | 'implementation'
  | 'validation'
  | 'after-evidence'
  | 'docs-verify'
  | 'audit'
  | 'automated-review'
  | 'human-review';

export interface WowStep {
  id: WowStepId;
  title: string;
  status: WowStepStatus;
  evidence: string[];
  notes: string[];
}

export interface WowCommandEvidence {
  command: string;
  exitCode: number;
  phase: 'before' | 'after' | 'verification' | 'audit' | 'review';
  output?: string;
}

export interface WowArtifact {
  name: string;
  phase: 'before' | 'after' | 'late-before' | 'summary';
  category: string;
  detail?: string;
}

export interface WowConversationSignals {
  exchangesWithoutStep: number;
  repeatedInvestigationWithoutProgress: boolean;
  declaredCompleteWithoutVerification: boolean;
  freshConversation: boolean;
  exploratoryOnlyRequest: boolean;
}

export interface WowPrerequisites {
  hasGit: boolean;
  hasPnpm: boolean;
  hasGh: boolean;
  ghAuthenticated: boolean;
  testEnvironmentReady: boolean;
  uiCaptureReady: boolean;
}

export interface WowRuntimeState {
  editedFiles: string[];
  taskBranch: string;
  commandEvidence: WowCommandEvidence[];
  artifacts: WowArtifact[];
  conversation: WowConversationSignals;
  prerequisites: WowPrerequisites;
  hardRuleViolation: boolean;
  irreversibleOperationRequested: boolean;
  auditFindingsRequireJudgment: boolean;
  reviewFindingsRequireJudgment: boolean;
}

export interface WowArgs {
  accept: boolean;
  taskName?: string;
  stateFile?: string;
  outputJson: boolean;
}

export interface WowBlocker {
  code:
    | 'missing-prerequisite'
    | 'ambiguous-task'
    | 'ordering-violation'
    | 'hard-rule-violation'
    | 'irreversible-operation'
    | 'audit-judgment-required'
    | 'review-judgment-required'
    | 'unresolved-failures';
  detail: string;
  remediation?: string;
}

export interface WowPreflightResult {
  ok: boolean;
  blockers: WowBlocker[];
  prerequisiteTasks: string[];
}

export interface WowPlan {
  acceptMode: {
    explicit: boolean;
    autoDetected: boolean;
    effective: boolean;
    reasons: string[];
    blockedBySignals: string[];
  };
  taskName: string;
  evidenceClasses: string[];
  evidenceMethod: string[];
  proactiveTriggers: string[];
  preflight: WowPreflightResult;
  checklist: WowStep[];
  blockers: WowBlocker[];
  nextAction: string;
  limitations: string[];
}

const CANONICAL_STEPS: Array<{ id: WowStepId; title: string }> = [
  { id: 'specification', title: 'Update documentation/specification.' },
  { id: 'tests-updated', title: 'Write or update focused tests.' },
  { id: 'focused-failure', title: 'Run focused tests and confirm expected failure.' },
  { id: 'before-evidence', title: 'Capture BEFORE evidence appropriate to change type.' },
  { id: 'implementation', title: 'Implement the smallest correct change.' },
  { id: 'validation', title: 'Run focused tests, then full validation chain.' },
  { id: 'after-evidence', title: 'Capture comparable AFTER evidence.' },
  { id: 'docs-verify', title: 'Verify documentation matches implementation.' },
  { id: 'audit', title: 'Run audit workflow and address findings.' },
  { id: 'automated-review', title: 'Run automated review workflow and address findings.' },
  { id: 'human-review', title: 'Summarize evidence and wait for human review.' },
];

function isDocumentationFile(path: string): boolean {
  return (
    path.startsWith('docs/') || path === 'README.md' || path === '.github/pull_request_template.md'
  );
}

function isTestFile(path: string): boolean {
  return (
    path.includes('/test/') ||
    path.includes('/tests/') ||
    path.endsWith('.test.ts') ||
    path.endsWith('.spec.ts')
  );
}

function isImplementationFile(path: string): boolean {
  return (
    (path.startsWith('apps/') ||
      path.startsWith('services/') ||
      path.startsWith('packages/') ||
      path.startsWith('scripts/') ||
      path.startsWith('ai/')) &&
    !isTestFile(path)
  );
}

function hasFailingFocusedTest(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some((entry) => entry.phase === 'before' && entry.exitCode !== 0);
}

function hasPassingFocusedTest(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some(
    (entry) =>
      (entry.command.includes('test:') || entry.command.includes('vitest run')) &&
      entry.phase !== 'before' &&
      entry.exitCode === 0,
  );
}

function hasValidatePass(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some(
    (entry) =>
      (entry.command.includes('pnpm run validate') ||
        entry.command.includes('pnpm run build:ci')) &&
      entry.exitCode === 0,
  );
}

function hasDocsVerification(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some(
    (entry) => entry.command.includes('pnpm run check:docs') && entry.exitCode === 0,
  );
}

function hasAuditPass(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some(
    (entry) =>
      (entry.phase === 'audit' || entry.command.includes('/audit')) && entry.exitCode === 0,
  );
}

function hasReviewPass(commandEvidence: WowCommandEvidence[]): boolean {
  return commandEvidence.some(
    (entry) =>
      (entry.phase === 'review' || entry.command.includes('/review-pr')) && entry.exitCode === 0,
  );
}

export function parseWowArgs(argv: string[]): WowArgs {
  let accept = false;
  let outputJson = false;
  let stateFile: string | undefined;
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') continue;
    if (token === '--accept') {
      accept = true;
      continue;
    }
    if (token === '--json') {
      outputJson = true;
      continue;
    }
    if (token === '--state-file') {
      const next = argv[index + 1];
      if (!next) throw new Error('usage: --state-file requires a path');
      stateFile = next;
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`usage: unsupported flag '${token}'`);
    }
    positional.push(token);
  }

  const taskName = positional.length > 0 ? positional.join(' ').trim() : undefined;
  return { accept, taskName, stateFile, outputJson };
}

export function inferEvidenceClasses(files: string[]): string[] {
  const classes = new Set<string>();
  for (const file of files) {
    if (file.startsWith('apps/')) classes.add('ui');
    if (
      file.startsWith('services/') ||
      file.startsWith('contracts/') ||
      file.startsWith('database/')
    ) {
      classes.add('api-server-data');
    }
    if (
      file.startsWith('ai/') ||
      file.startsWith('.github/prompts/') ||
      file.startsWith('scripts/eval-') ||
      file.startsWith('services/ai-orchestration/')
    ) {
      classes.add('ai-agent-routing-prompt');
    }
    if (file.includes('a11y') || file.includes('accessibility')) classes.add('accessibility');
    if (file.includes('security') || file.includes('sdl') || file.startsWith('policies/'))
      classes.add('security');
    if (file.includes('perf') || file.includes('budget')) classes.add('performance');
    if (file.includes('telemetry') || file.includes('observability')) classes.add('telemetry');
    if (
      file.startsWith('.github/workflows/') ||
      file.startsWith('infrastructure/') ||
      file.startsWith('docker-compose')
    ) {
      classes.add('infrastructure');
    }
    if (file.startsWith('docs/') || file.endsWith('.md') || file.startsWith('.github/')) {
      classes.add('ci-build-config-docs');
    }
  }

  if (classes.size === 0) classes.add('ci-build-config-docs');
  return [...classes];
}

export function evidenceMethodForClasses(classes: string[]): string[] {
  const methods: string[] = [];
  if (classes.includes('ui')) {
    methods.push('UI before/after screenshots or recordings plus focused test outputs.');
  }
  if (classes.includes('api-server-data')) {
    methods.push('Failing then passing request or test evidence from the same scenario.');
  }
  if (classes.includes('ai-agent-routing-prompt')) {
    methods.push('Matched before/after prompts, transcripts, tool trajectories, and outputs.');
  }
  if (classes.includes('accessibility')) {
    methods.push(
      'Programmatic accessibility state evidence and focused accessibility test output.',
    );
  }
  if (classes.includes('security')) {
    methods.push('Security reproduction evidence, patched behavior, and regression test output.');
  }
  if (classes.includes('performance')) {
    methods.push('Comparable timing or profiler output using the same command and data shape.');
  }
  if (classes.includes('telemetry')) {
    methods.push('Malformed or missing event evidence, then corrected event shape evidence.');
  }
  if (classes.includes('infrastructure')) {
    methods.push('Rendered plan/template output and platform validation evidence.');
  }
  if (classes.includes('ci-build-config-docs')) {
    methods.push('Failing then passing command output or rendered diff evidence.');
  }
  return methods;
}

export function inferChecklist(state: WowRuntimeState): WowStep[] {
  const docsEdited = state.editedFiles.some((file) => isDocumentationFile(file));
  const testsEdited = state.editedFiles.some((file) => isTestFile(file));
  const implementationEdited = state.editedFiles.some((file) => isImplementationFile(file));
  const hasBeforeEvidence = state.artifacts.some((artifact) => artifact.phase === 'before');
  const hasAfterEvidence = state.artifacts.some((artifact) => artifact.phase === 'after');
  const hasLateBefore = state.artifacts.some((artifact) => artifact.phase === 'late-before');
  const hasSummary = state.artifacts.some((artifact) => artifact.phase === 'summary');

  const stepMap = new Map<WowStepId, WowStep>();
  for (const step of CANONICAL_STEPS) {
    stepMap.set(step.id, {
      id: step.id,
      title: step.title,
      status: 'pending',
      evidence: [],
      notes: [],
    });
  }

  if (docsEdited) {
    stepMap.get('specification')!.status = 'completed';
    stepMap.get('specification')!.evidence.push('Detected documentation/specification file edits.');
  }

  if (testsEdited) {
    stepMap.get('tests-updated')!.status = 'completed';
    stepMap.get('tests-updated')!.evidence.push('Detected focused test file edits.');
  }

  if (hasFailingFocusedTest(state.commandEvidence)) {
    stepMap.get('focused-failure')!.status = 'completed';
    stepMap
      .get('focused-failure')!
      .evidence.push('Observed focused test command failure before implementation.');
  }

  if (hasBeforeEvidence) {
    stepMap.get('before-evidence')!.status = 'completed';
    stepMap.get('before-evidence')!.evidence.push('BEFORE evidence artifact is present.');
  }

  if (implementationEdited) {
    stepMap.get('implementation')!.status = 'completed';
    stepMap.get('implementation')!.evidence.push('Detected implementation surface edits.');
  }

  if (hasPassingFocusedTest(state.commandEvidence) && hasValidatePass(state.commandEvidence)) {
    stepMap.get('validation')!.status = 'completed';
    stepMap
      .get('validation')!
      .evidence.push('Focused tests and full validation chain were recorded as passing.');
  }

  if (hasAfterEvidence) {
    stepMap.get('after-evidence')!.status = 'completed';
    stepMap.get('after-evidence')!.evidence.push('AFTER evidence artifact is present.');
  }

  if (hasDocsVerification(state.commandEvidence) || docsEdited) {
    stepMap.get('docs-verify')!.status = 'completed';
    stepMap.get('docs-verify')!.evidence.push('Documentation verification evidence is present.');
  }

  if (hasAuditPass(state.commandEvidence) && !state.auditFindingsRequireJudgment) {
    stepMap.get('audit')!.status = 'completed';
    stepMap.get('audit')!.evidence.push('Audit workflow reports no unresolved findings.');
  }

  if (hasReviewPass(state.commandEvidence) && !state.reviewFindingsRequireJudgment) {
    stepMap.get('automated-review')!.status = 'completed';
    stepMap
      .get('automated-review')!
      .evidence.push('Automated review reports no unresolved findings.');
  }

  if (hasSummary) {
    stepMap.get('human-review')!.status = 'completed';
    stepMap
      .get('human-review')!
      .evidence.push('Evidence summary artifact is present for human review.');
  }

  if (implementationEdited && !hasBeforeEvidence) {
    stepMap.get('before-evidence')!.status = hasLateBefore ? 'late-before-required' : 'blocked';
    stepMap
      .get('before-evidence')!
      .notes.push(
        hasLateBefore
          ? 'Ordering violation recorded; late-before evidence captured and must be disclosed in PR summary.'
          : 'Ordering violation: implementation happened before BEFORE evidence.',
      );
  }

  const ordered = CANONICAL_STEPS.map((step) => stepMap.get(step.id)!);
  let prerequisiteMissing = false;
  for (const step of ordered) {
    if (prerequisiteMissing && step.status === 'completed') {
      step.status = 'blocked';
      step.notes.push('Blocked by earlier incomplete prerequisite step.');
    }
    if (step.status !== 'completed') prerequisiteMissing = true;
  }
  return ordered;
}

export function detectProactiveTriggers(state: WowRuntimeState, checklist: WowStep[]): string[] {
  const completedCount = checklist.filter((step) => step.status === 'completed').length;
  const implementationStep = checklist.find((step) => step.id === 'implementation');
  const beforeStep = checklist.find((step) => step.id === 'before-evidence');
  const validationStep = checklist.find((step) => step.id === 'validation');

  const triggers: string[] = [];
  if (state.conversation.exchangesWithoutStep >= 10 && completedCount === 0) {
    triggers.push('10+ exchanges occurred without completing a clear loop step.');
  }
  if (implementationStep?.status === 'completed' && beforeStep?.status !== 'completed') {
    triggers.push(
      'Implementation started before tests/documentation/BEFORE evidence were complete.',
    );
  }
  if (state.conversation.repeatedInvestigationWithoutProgress && completedCount < 2) {
    triggers.push('Repeated investigation is occurring without progress evidence.');
  }
  if (
    state.conversation.declaredCompleteWithoutVerification &&
    validationStep?.status !== 'completed'
  ) {
    triggers.push('Work was declared complete without verification and review evidence.');
  }
  return triggers;
}

export function shouldAutoAcceptMode(
  state: WowRuntimeState,
  checklist: WowStep[],
): {
  autoAccept: boolean;
  reasons: string[];
  blockedBySignals: string[];
} {
  const completedCount = checklist.filter((step) => step.status === 'completed').length;
  const strongSignals = [
    state.editedFiles.some((file) => isImplementationFile(file)),
    completedCount >= 4,
    completedCount >= 3,
    state.taskBranch !== 'main' && state.taskBranch !== 'master' && state.editedFiles.length > 0,
  ];

  const blockedBySignals: string[] = [];
  if (state.conversation.freshConversation) blockedBySignals.push('fresh-conversation');
  if (state.editedFiles.length === 0) blockedBySignals.push('no-edits-yet');
  if (state.conversation.exploratoryOnlyRequest) blockedBySignals.push('exploratory-only-request');
  if (state.hardRuleViolation) blockedBySignals.push('existing-hard-rule-violation');

  const strongCount = strongSignals.filter(Boolean).length;
  const autoAccept = blockedBySignals.length === 0 && strongCount >= 2;

  const reasons: string[] = [];
  if (autoAccept) {
    reasons.push(
      'Auto-accept enabled because at least two strong established-work signals were detected.',
    );
  }

  return { autoAccept, reasons, blockedBySignals };
}

export function runPreflight(
  state: WowRuntimeState,
  evidenceClasses: string[],
  acceptMode: boolean,
): WowPreflightResult {
  const blockers: WowBlocker[] = [];
  const prerequisiteTasks: string[] = [];

  const addBlocker = (detail: string, remediation: string): void => {
    blockers.push({ code: 'missing-prerequisite', detail, remediation });
    if (acceptMode) prerequisiteTasks.push(`${detail} Remediation: ${remediation}`);
  };

  if (!state.prerequisites.hasGit) {
    addBlocker('Git is required for branch, diff, and evidence inference.', 'git --version');
  }
  if (!state.prerequisites.hasPnpm) {
    addBlocker(
      'pnpm is required to run repository-native validation commands.',
      'corepack enable && corepack prepare pnpm@10.0.0 --activate',
    );
  }
  if (!state.prerequisites.testEnvironmentReady) {
    addBlocker(
      'Test environment is not ready for focused and full validation.',
      'pnpm install --frozen-lockfile',
    );
  }
  if (!state.prerequisites.hasGh || !state.prerequisites.ghAuthenticated) {
    addBlocker(
      'GitHub authentication is required for PR and review workflow evidence.',
      'gh auth login',
    );
  }

  if (evidenceClasses.includes('ui') && !state.prerequisites.uiCaptureReady) {
    addBlocker(
      'UI evidence capture is not ready for before/after artifact requirements.',
      'pnpm exec playwright install --with-deps chromium',
    );
  }

  return {
    ok: blockers.length === 0,
    blockers,
    prerequisiteTasks,
  };
}

function inferTaskName(taskName: string | undefined, state: WowRuntimeState): string | undefined {
  if (taskName && taskName.trim().length > 0) return taskName.trim();
  const edited = state.editedFiles.filter(
    (file) => isImplementationFile(file) || isDocumentationFile(file),
  );
  if (edited.length === 1) return `Update ${edited[0]}`;
  if (edited.length > 1) {
    const topLevel = new Set(edited.map((file) => file.split('/')[0]));
    if (topLevel.size === 1) return `Update ${[...topLevel][0]} workflow`;
  }
  return undefined;
}

function firstActionableStep(checklist: WowStep[]): WowStep | undefined {
  return checklist.find((step) => step.status !== 'completed');
}

export function buildWowPlan(state: WowRuntimeState, args: WowArgs): WowPlan {
  const checklist = inferChecklist(state);
  const evidenceClasses = inferEvidenceClasses(state.editedFiles);
  const evidenceMethod = evidenceMethodForClasses(evidenceClasses);
  const proactiveTriggers = detectProactiveTriggers(state, checklist);
  const auto = shouldAutoAcceptMode(state, checklist);
  const effectiveAccept = args.accept || auto.autoAccept;
  const taskName = inferTaskName(args.taskName, state);
  const preflight = runPreflight(state, evidenceClasses, effectiveAccept);

  const blockers: WowBlocker[] = [];
  if (!taskName) {
    blockers.push({
      code: 'ambiguous-task',
      detail:
        'Task name is ambiguous; provide /wow <task-name> or create in-scope edits to infer scope.',
    });
  }

  if (state.hardRuleViolation) {
    blockers.push({
      code: 'hard-rule-violation',
      detail:
        'Existing hard-rule violation must be resolved before continuing /wow implementation steps.',
    });
  }

  const beforeStep = checklist.find((step) => step.id === 'before-evidence');
  if (beforeStep?.status === 'blocked' || beforeStep?.status === 'late-before-required') {
    blockers.push({
      code: 'ordering-violation',
      detail:
        beforeStep.status === 'late-before-required'
          ? 'Implementation ordering violation: capture late-before evidence and disclose limitation in PR summary.'
          : 'Implementation ordering violation: BEFORE evidence is missing prior to implementation.',
    });
  }

  if (state.irreversibleOperationRequested) {
    blockers.push({
      code: 'irreversible-operation',
      detail: 'Irreversible operation requested; /wow must stop for human confirmation.',
    });
  }

  if (state.auditFindingsRequireJudgment) {
    blockers.push({
      code: 'audit-judgment-required',
      detail: 'Audit findings require judgment; stop and request human decision.',
    });
  }

  if (state.reviewFindingsRequireJudgment) {
    blockers.push({
      code: 'review-judgment-required',
      detail: 'Automated review findings require judgment; stop and request human decision.',
    });
  }

  const unresolvedFailures = state.commandEvidence.some(
    (entry) => entry.phase !== 'before' && entry.exitCode !== 0,
  );
  if (unresolvedFailures) {
    blockers.push({
      code: 'unresolved-failures',
      detail: 'Unresolved failing commands exist; resolve failures before continuing the loop.',
    });
  }

  blockers.push(...preflight.blockers);

  const actionable = firstActionableStep(checklist);
  let nextAction = 'Await human review.';
  if (!effectiveAccept) {
    nextAction =
      'Plan is prepared. Re-run with /wow --accept (or pnpm run workflow:wow -- --accept) to execute from earliest incomplete step.';
  } else if (blockers.length > 0) {
    nextAction =
      'Stop: resolve blockers or prerequisite tasks before implementation. --accept cannot bypass these gates.';
  } else if (actionable) {
    nextAction = `Start ${actionable.id}: ${actionable.title}`;
  }

  const limitations: string[] = [];
  if (beforeStep?.status === 'late-before-required') {
    limitations.push(
      'late-before evidence was captured after implementation and cannot replace true pre-change evidence.',
    );
  }

  return {
    acceptMode: {
      explicit: args.accept,
      autoDetected: auto.autoAccept,
      effective: effectiveAccept,
      reasons: auto.reasons,
      blockedBySignals: auto.blockedBySignals,
    },
    taskName: taskName ?? 'UNRESOLVED',
    evidenceClasses,
    evidenceMethod,
    proactiveTriggers,
    preflight,
    checklist,
    blockers,
    nextAction,
    limitations,
  };
}

function statusIcon(status: WowStepStatus): string {
  if (status === 'completed') return '[x]';
  if (status === 'in-progress') return '[>]';
  if (status === 'blocked') return '[!]';
  if (status === 'late-before-required') return '[~]';
  return '[ ]';
}

export function renderWowPlan(plan: WowPlan): string {
  const lines: string[] = [];
  lines.push('# /wow implementation-loop course correction');
  lines.push('');
  lines.push(`Task: ${plan.taskName}`);
  lines.push(
    `Accept mode: ${plan.acceptMode.effective ? 'enabled' : 'disabled'} (explicit=${plan.acceptMode.explicit}, auto=${plan.acceptMode.autoDetected})`,
  );
  if (plan.acceptMode.blockedBySignals.length > 0) {
    lines.push(`Auto-accept blocked by: ${plan.acceptMode.blockedBySignals.join(', ')}`);
  }
  if (plan.proactiveTriggers.length > 0) {
    lines.push('Proactive triggers:');
    for (const trigger of plan.proactiveTriggers) lines.push(`- ${trigger}`);
  }

  lines.push('');
  lines.push('Evidence classification:');
  for (const category of plan.evidenceClasses) lines.push(`- ${category}`);
  lines.push('Evidence method:');
  for (const method of plan.evidenceMethod) lines.push(`- ${method}`);

  lines.push('');
  lines.push('Checklist:');
  for (const step of plan.checklist) {
    lines.push(`${statusIcon(step.status)} ${step.id}: ${step.title}`);
    for (const evidence of step.evidence) lines.push(`  - evidence: ${evidence}`);
    for (const note of step.notes) lines.push(`  - note: ${note}`);
  }

  if (plan.preflight.prerequisiteTasks.length > 0) {
    lines.push('');
    lines.push('Preflight prerequisite tasks:');
    for (const task of plan.preflight.prerequisiteTasks) lines.push(`- ${task}`);
  }

  if (plan.blockers.length > 0) {
    lines.push('');
    lines.push('Blockers:');
    for (const blocker of plan.blockers) {
      lines.push(`- ${blocker.code}: ${blocker.detail}`);
      if (blocker.remediation) lines.push(`  remediation: ${blocker.remediation}`);
    }
  }

  if (plan.limitations.length > 0) {
    lines.push('');
    lines.push('Limitations to disclose in PR summary:');
    for (const limitation of plan.limitations) lines.push(`- ${limitation}`);
  }

  lines.push('');
  lines.push(`Next action: ${plan.nextAction}`);
  return `${lines.join('\n')}\n`;
}
