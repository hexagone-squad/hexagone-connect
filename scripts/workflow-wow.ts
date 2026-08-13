import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildWowPlan,
  parseWowArgs,
  renderWowPlan,
  type WowCommandEvidence,
  type WowRuntimeState,
} from './workflow-wow-lib.js';

function commandAvailable(command: string): boolean {
  const probe = spawnSync('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
  return probe.status === 0;
}

function gitBranch(): string {
  try {
    return (
      execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim() || 'unknown'
    );
  } catch {
    return 'unknown';
  }
}

function gitChangedFiles(): string[] {
  try {
    return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function ghAuthenticated(): boolean {
  if (!commandAvailable('gh')) return false;
  const status = spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  return status.status === 0;
}

function defaultState(): WowRuntimeState {
  const files = gitChangedFiles();
  return {
    editedFiles: files,
    taskBranch: gitBranch(),
    commandEvidence: [],
    artifacts: [],
    conversation: {
      exchangesWithoutStep: 0,
      repeatedInvestigationWithoutProgress: false,
      declaredCompleteWithoutVerification: false,
      freshConversation: files.length === 0,
      exploratoryOnlyRequest: false,
    },
    prerequisites: {
      hasGit: commandAvailable('git'),
      hasPnpm: commandAvailable('pnpm'),
      hasGh: commandAvailable('gh'),
      ghAuthenticated: ghAuthenticated(),
      testEnvironmentReady: existsSync(resolve(process.cwd(), 'package.json')),
      uiCaptureReady: existsSync(resolve(process.cwd(), 'tests/e2e')),
    },
    hardRuleViolation: false,
    irreversibleOperationRequested: false,
    auditFindingsRequireJudgment: false,
    reviewFindingsRequireJudgment: false,
  };
}

function mergeState(base: WowRuntimeState, override: Partial<WowRuntimeState>): WowRuntimeState {
  return {
    ...base,
    ...override,
    conversation: { ...base.conversation, ...(override.conversation ?? {}) },
    prerequisites: { ...base.prerequisites, ...(override.prerequisites ?? {}) },
    commandEvidence:
      (override.commandEvidence as WowCommandEvidence[] | undefined) ?? base.commandEvidence,
    artifacts: override.artifacts ?? base.artifacts,
  };
}

function loadState(path: string | undefined): WowRuntimeState {
  const base = defaultState();
  if (!path) return base;

  const absolute = resolve(process.cwd(), path);
  const payload = JSON.parse(readFileSync(absolute, 'utf8')) as Partial<WowRuntimeState>;
  return mergeState(base, payload);
}

if (process.argv[1]?.endsWith('workflow-wow.ts')) {
  const args = parseWowArgs(process.argv.slice(2));
  const state = loadState(args.stateFile);
  const plan = buildWowPlan(state, args);

  if (args.outputJson) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } else {
    process.stdout.write(renderWowPlan(plan));
  }

  if (plan.blockers.length > 0 || !plan.preflight.ok) process.exitCode = 2;
}
