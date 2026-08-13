import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import {
  buildDiffFingerprint,
  calculateBudgets,
  isReceiptStale,
  parseReceipt,
  pruneRunFolders,
  resolveDefaultBranchFromSymbolicRef,
} from '../../scripts/eval-claude-md-lib.js';

describe('eval-claude-md workflow primitives', () => {
  it('resolves default branch from origin symbolic ref', () => {
    expect(resolveDefaultBranchFromSymbolicRef('refs/remotes/origin/main')).toBe('main');
  });

  it('resolves merge-base against default branch', () => {
    const result = spawnSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^[a-f0-9]{40}$/);
  });

  it('executes complete scenario set with 4 scenarios', () => {
    const tempRoot = mkdtempSync(resolve(tmpdir(), 'eval-claude-md-'));
    const promptsDir = resolve(tempRoot, 'prompts');
    mkdirSync(promptsDir, { recursive: true });

    for (const name of [
      'eval-claude-md',
      'constitute',
      'reflect',
      'audit',
      'verify',
      'review-pr',
    ]) {
      writeFileSync(resolve(promptsDir, `${name}.prompt.md`), `---\nname: ${name}\n---\n`);
    }

    const surfaceFile = resolve(tempRoot, 'surface.json');
    writeFileSync(
      surfaceFile,
      JSON.stringify(
        {
          files: {
            'AGENTS.md': { exists: true, bytes: 10, content: 'rule', contentSha: 'x' },
            'CLAUDE.md': { exists: true, bytes: 10, content: 'rule', contentSha: 'x' },
            '.github/copilot-instructions.md': {
              exists: true,
              bytes: 10,
              content: 'rule',
              contentSha: 'x',
            },
            'docs/methodology/CONSTITUTION.md': {
              exists: true,
              bytes: 10,
              content: 'rule',
              contentSha: 'x',
            },
            '.github/instructions/ai.instructions.md': {
              exists: true,
              bytes: 10,
              content: 'rule',
              contentSha: 'x',
            },
          },
        },
        null,
        2,
      ),
    );

    const budgetFile = resolve(tempRoot, 'budget.json');
    const eagerFile = resolve(tempRoot, 'eager.json');
    const pathScopedFile = resolve(tempRoot, 'path-scoped.json');
    writeFileSync(
      budgetFile,
      JSON.stringify({
        maxEagerFiles: 10,
        maxEagerBytes: 1000,
        maxPathScopedFiles: 10,
        maxPathScopedBytes: 1000,
      }),
    );
    writeFileSync(
      eagerFile,
      JSON.stringify(['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md']),
    );
    writeFileSync(pathScopedFile, JSON.stringify(['.github/instructions/ai.instructions.md']));

    const runner = spawnSync('pnpm', [
      'tsx',
      'scripts/eval-claude-md-runner.ts',
      '--mode',
      'current',
      '--surface-file',
      surfaceFile,
      '--prompt-directory',
      promptsDir,
      '--budget-file',
      budgetFile,
      '--eager-file',
      eagerFile,
      '--path-scoped-file',
      pathScopedFile,
    ], {
      encoding: 'utf8',
    });

    expect(runner.status).toBe(0);
    const scenarioRows = runner.stdout
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.includes('Scenario') && !line.includes('---'));
    expect(scenarioRows).toHaveLength(4);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('handles independent runner failure honestly', () => {
    const tempRoot = mkdtempSync(resolve(tmpdir(), 'eval-claude-md-failure-'));
    const budgetFile = resolve(tempRoot, 'budget.json');
    const eagerFile = resolve(tempRoot, 'eager.json');
    const pathScopedFile = resolve(tempRoot, 'path-scoped.json');
    writeFileSync(
      budgetFile,
      JSON.stringify({
        maxEagerFiles: 1,
        maxEagerBytes: 1,
        maxPathScopedFiles: 1,
        maxPathScopedBytes: 1,
      }),
    );
    writeFileSync(eagerFile, JSON.stringify([]));
    writeFileSync(pathScopedFile, JSON.stringify([]));

    const runner = spawnSync('pnpm', [
      'tsx',
      'scripts/eval-claude-md-runner.ts',
      '--mode',
      'baseline',
      '--surface-file',
      resolve(tempRoot, 'missing-surface.json'),
      '--prompt-directory',
      resolve(tempRoot, 'missing-prompts'),
      '--budget-file',
      budgetFile,
      '--eager-file',
      eagerFile,
      '--path-scoped-file',
      pathScopedFile,
    ], {
      encoding: 'utf8',
    });

    expect(runner.status).not.toBe(0);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('calculates eager and path-scoped budgets independently without double counting', () => {
    const result = calculateBudgets({
      eagerFiles: ['AGENTS.md', 'CLAUDE.md'],
      pathScopedFiles: ['CLAUDE.md', '.github/instructions/ai.instructions.md'],
      fileSizes: {
        'AGENTS.md': 20,
        'CLAUDE.md': 20,
        '.github/instructions/ai.instructions.md': 30,
      },
      budget: {
        maxEagerFiles: 2,
        maxEagerBytes: 40,
        maxPathScopedFiles: 1,
        maxPathScopedBytes: 30,
      },
    });

    expect(result.withinBudget).toBe(true);
    expect(result.usage.pathScopedFiles).toBe(1);
    expect(result.usage.pathScopedBytes).toBe(30);
  });

  it('keeps diff fingerprints stable and includes untracked content', () => {
    const base = buildDiffFingerprint({
      committed: 'a',
      staged: 'b',
      unstaged: 'c',
      untracked: [{ path: 'x.txt', content: 'hello' }],
    });
    const same = buildDiffFingerprint({
      committed: 'a',
      staged: 'b',
      unstaged: 'c',
      untracked: [{ path: 'x.txt', content: 'hello' }],
    });
    const changed = buildDiffFingerprint({
      committed: 'a',
      staged: 'b',
      unstaged: 'c',
      untracked: [{ path: 'x.txt', content: 'hello world' }],
    });

    expect(base).toBe(same);
    expect(base).not.toBe(changed);
  });

  it('rejects stale receipts after diff changes', () => {
    const receipt = ['EVAL PASS', 'Base: a', 'Head: b', 'Diff: old'].join('\n');
    expect(parseReceipt(receipt).diff).toBe('old');
    expect(isReceiptStale(receipt, 'new')).toBe(true);
    expect(isReceiptStale(receipt, 'old')).toBe(false);
  });

  it('prunes run folders to latest 10', () => {
    const runs = Array.from({ length: 14 }, (_, index) => ({
      path: `run-${index}`,
      createdAt: index,
    }));
    const { keep, remove } = pruneRunFolders(runs, 10);
    expect(keep).toHaveLength(10);
    expect(remove).toHaveLength(4);
  });

  it('reports BLOCKED when independent judge is unavailable', () => {
    const run = spawnSync('pnpm', ['run', 'workflow:eval-claude-md'], {
      encoding: 'utf8',
      env: { ...process.env, EVAL_CLAUDE_MD_JUDGE_CMD: '' },
    });

    expect(run.status).not.toBe(0);

    const runRoot = resolve(process.cwd(), '.eval-claude-md/runs');
    const latest = readdirSync(runRoot).sort().at(-1);
    expect(latest).toBeTruthy();

    const report = readFileSync(resolve(runRoot, latest!, 'judge-report.md'), 'utf8');
    expect(report).toContain('Status: BLOCKED');
  });
});
