import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildDiffFingerprint,
  detectCombinedConstraintRules,
  detectFalseImplementsClaims,
  detectNumericRulesWithoutEnforcement,
  isReceiptStale,
  pruneRunFolders,
  resolveDefaultBranchFromSymbolicRef,
  sha256,
} from './eval-claude-md-lib.js';

interface Config {
  instructionSurface: string[];
  eagerFiles: string[];
  pathScopedFiles: string[];
  budgets: {
    maxEagerFiles: number;
    maxEagerBytes: number;
    maxPathScopedFiles: number;
    maxPathScopedBytes: number;
  };
}

interface SurfaceSnapshot {
  files: Record<string, { exists: boolean; bytes: number; content: string; contentSha: string }>;
}

function run(command: string, args: string[], allowFailure = false): string {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `${command} failed`);
  }
  return (result.stdout ?? '').trim();
}

function runWithStatus(
  command: string,
  args: string[],
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function loadConfig(): Config {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), '.github/workflows/eval-claude-md/config.json'), 'utf8'),
  ) as Config;
}

function timestamp(): string {
  const now = new Date();
  const two = (value: number): string => String(value).padStart(2, '0');
  return `${now.getUTCFullYear()}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}-${two(now.getUTCHours())}${two(now.getUTCMinutes())}${two(now.getUTCSeconds())}`;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function getDefaultBranch(): string {
  const symbolic = runWithStatus('git', ['symbolic-ref', 'refs/remotes/origin/HEAD']);
  if (symbolic.status === 0) {
    return resolveDefaultBranchFromSymbolicRef(symbolic.stdout.trim());
  }

  const remote = run('git', ['remote', 'show', 'origin']);
  const headBranch = remote.match(/^\s*HEAD branch:\s*(\S+)\s*$/m)?.[1];
  if (!headBranch) {
    throw new Error('Unable to resolve default branch from origin metadata');
  }
  return headBranch;
}

function getMergeBase(defaultBranch: string): string {
  return run('git', ['merge-base', 'HEAD', `origin/${defaultBranch}`]);
}

function getHeadSha(): string {
  return run('git', ['rev-parse', 'HEAD']);
}

function fileFromRef(ref: string, file: string): string | null {
  const response = runWithStatus('git', ['show', `${ref}:${file}`]);
  if (response.status !== 0) return null;
  return response.stdout;
}

function fileFromDisk(file: string): string | null {
  const absolute = resolve(process.cwd(), file);
  if (!existsSync(absolute)) return null;
  return readFileSync(absolute, 'utf8');
}

function snapshotSurface(ref: string | null, files: string[]): SurfaceSnapshot {
  const snapshot: SurfaceSnapshot = { files: {} };
  for (const file of files) {
    const content = ref ? fileFromRef(ref, file) : fileFromDisk(file);
    if (content === null) {
      snapshot.files[file] = { exists: false, bytes: 0, content: '', contentSha: sha256('') };
      continue;
    }
    snapshot.files[file] = {
      exists: true,
      bytes: Buffer.byteLength(content, 'utf8'),
      content,
      contentSha: sha256(content),
    };
  }
  return snapshot;
}

function toSurfaceMarkdown(title: string, snapshot: SurfaceSnapshot): string {
  const rows = Object.entries(snapshot.files)
    .map(
      ([file, value]) =>
        `| ${file} | ${value.exists ? 'yes' : 'no'} | ${value.bytes} | ${value.contentSha} |`,
    )
    .join('\n');
  return [
    `# ${title}`,
    '',
    '| File | Exists | Bytes | SHA256 |',
    '| --- | --- | --- | --- |',
    rows,
    '',
  ].join('\n');
}

function instructionSurfaceChanged(base: SurfaceSnapshot, current: SurfaceSnapshot): string[] {
  const changed: string[] = [];
  for (const file of Object.keys(current.files)) {
    const previous = base.files[file];
    const now = current.files[file];
    if (!previous || previous.contentSha !== now.contentSha || previous.exists !== now.exists) {
      changed.push(file);
    }
  }
  return changed;
}

function completeDiffFingerprint(baseSha: string, headSha: string): string {
  const committed = runWithStatus('git', ['diff', '--binary', `${baseSha}...${headSha}`]).stdout;
  const staged = runWithStatus('git', ['diff', '--binary', '--staged']).stdout;
  const unstaged = runWithStatus('git', ['diff', '--binary']).stdout;
  const untrackedPaths = runWithStatus('git', ['ls-files', '--others', '--exclude-standard'])
    .stdout.split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const untracked = untrackedPaths.map((path) => ({
    path,
    content: readFileSync(resolve(process.cwd(), path), 'utf8'),
  }));

  return buildDiffFingerprint({ committed, staged, unstaged, untracked });
}

function collectExistingPaths(): Set<string> {
  const paths = new Set<string>();
  const queue = [process.cwd()];

  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const entry of readdirSync(current)) {
      if (entry === '.git' || entry === 'node_modules') continue;
      const absolute = resolve(current, entry);
      const relative = absolute.replace(`${process.cwd()}/`, '');
      const stats = statSync(absolute);
      if (stats.isDirectory()) {
        queue.push(absolute);
      } else {
        paths.add(relative);
      }
    }
  }

  return paths;
}

function writeFile(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content, 'utf8');
}

function runScenarioRunner(params: {
  mode: 'baseline' | 'current';
  runRoot: string;
  surfaceFile: string;
  config: Config;
}): { status: number; stdout: string; stderr: string } {
  const budgetFile = resolve(params.runRoot, 'budget.json');
  const eagerFile = resolve(params.runRoot, 'eager.json');
  const pathScopedFile = resolve(params.runRoot, 'path-scoped.json');
  writeFile(budgetFile, JSON.stringify(params.config.budgets, null, 2));
  writeFile(eagerFile, JSON.stringify(params.config.eagerFiles, null, 2));
  writeFile(pathScopedFile, JSON.stringify(params.config.pathScopedFiles, null, 2));

  return runWithStatus('pnpm', [
    'tsx',
    'scripts/eval-claude-md-runner.ts',
    '--mode',
    params.mode,
    '--surface-file',
    params.surfaceFile,
    '--prompt-directory',
    '.github/prompts',
    '--budget-file',
    budgetFile,
    '--eager-file',
    eagerFile,
    '--path-scoped-file',
    pathScopedFile,
  ]);
}

function parseScenarioScores(markdown: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|') || line.includes('Scenario') || line.includes('---')) continue;
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    const score = Number(cells[1]);
    if (!Number.isFinite(score)) continue;
    result[cells[0]] = score;
  }
  return result;
}

function compareScenarioResults(baselineReport: string, currentReport: string): string[] {
  const baseline = parseScenarioScores(baselineReport);
  const current = parseScenarioScores(currentReport);

  const failures: string[] = [];
  for (const [scenario, baseScore] of Object.entries(baseline)) {
    const currentScore = current[scenario];
    if (currentScore === undefined) {
      failures.push(`Scenario missing in current report: ${scenario}`);
      continue;
    }
    if (currentScore < baseScore) {
      failures.push(
        `Current score ${currentScore} is lower than baseline ${baseScore} for scenario ${scenario}`,
      );
    }
  }
  return failures;
}

function buildPhase1Report(params: {
  changedSurface: string[];
  baseline: SurfaceSnapshot;
  current: SurfaceSnapshot;
  existingPaths: Set<string>;
  judgeAvailable: boolean;
}): { markdown: string; blocked: boolean; findings: string[]; judgeUnavailable: boolean } {
  const currentCombined = Object.values(params.current.files)
    .map((value) => value.content)
    .join('\n\n');

  const findings = [
    ...detectFalseImplementsClaims(currentCombined, params.existingPaths),
    ...detectNumericRulesWithoutEnforcement(currentCombined),
    ...detectCombinedConstraintRules(currentCombined),
  ];

  if (!params.judgeAvailable) {
    return {
      blocked: true,
      findings,
      judgeUnavailable: true,
      markdown: [
        '# Phase 1 Structural Evaluation',
        '',
        'Status: BLOCKED',
        '',
        'Reason: Independent judge command is unavailable. Set `EVAL_CLAUDE_MD_JUDGE_CMD`.',
        '',
        `Changed instruction/rule files: ${params.changedSurface.length}`,
        ...params.changedSurface.map((file) => `- ${file}`),
        '',
      ].join('\n'),
    };
  }

  const findingsList =
    findings.length === 0 ? ['- none'] : findings.map((finding) => `- ${finding}`);
  return {
    blocked: findings.length > 0,
    findings,
    judgeUnavailable: false,
    markdown: [
      '# Phase 1 Structural Evaluation',
      '',
      findings.length > 0 ? 'Status: BLOCKED' : 'Status: COMPLETE',
      '',
      `Changed instruction/rule files: ${params.changedSurface.length}`,
      ...params.changedSurface.map((file) => `- ${file}`),
      '',
      'Findings:',
      ...findingsList,
      '',
    ].join('\n'),
  };
}

function latestReceiptPath(runRoot: string): string | null {
  if (!existsSync(runRoot)) return null;
  const runFolders = readdirSync(runRoot)
    .map((name) => ({ name, path: resolve(runRoot, name) }))
    .filter(({ path }) => statSync(path).isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const folder of runFolders) {
    const receipt = resolve(folder.path, 'pass-receipt.txt');
    if (existsSync(receipt)) return receipt;
  }
  return null;
}

function pruneRuns(runRoot: string): void {
  if (!existsSync(runRoot)) return;
  const runs = readdirSync(runRoot)
    .map((name) => ({
      path: resolve(runRoot, name),
      createdAt: statSync(resolve(runRoot, name)).mtimeMs,
    }))
    .filter((run) => statSync(run.path).isDirectory());

  const { remove } = pruneRunFolders(runs, 10);
  for (const run of remove) rmSync(run.path, { recursive: true, force: true });
}

function judgeAvailable(): boolean {
  return Boolean(process.env.EVAL_CLAUDE_MD_JUDGE_CMD);
}

function main(): void {
  const config = loadConfig();
  const defaultBranch = getDefaultBranch();
  const mergeBase = getMergeBase(defaultBranch);
  const headSha = getHeadSha();

  const root = resolve(process.cwd(), '.eval-claude-md/runs');
  ensureDir(root);
  const runPath = resolve(root, timestamp());
  ensureDir(runPath);

  const baselineSurface = snapshotSurface(mergeBase, config.instructionSurface);
  const currentSurface = snapshotSurface(null, config.instructionSurface);
  const changedSurface = instructionSurfaceChanged(baselineSurface, currentSurface);

  writeFile(
    resolve(runPath, 'baseline-snapshot.md'),
    toSurfaceMarkdown('Baseline Surface', baselineSurface),
  );
  writeFile(
    resolve(runPath, 'current-snapshot.md'),
    toSurfaceMarkdown('Current Surface', currentSurface),
  );
  writeFile(resolve(runPath, 'baseline-snapshot.json'), JSON.stringify(baselineSurface, null, 2));
  writeFile(resolve(runPath, 'current-snapshot.json'), JSON.stringify(currentSurface, null, 2));

  const phase1 = buildPhase1Report({
    changedSurface,
    baseline: baselineSurface,
    current: currentSurface,
    existingPaths: collectExistingPaths(),
    judgeAvailable: judgeAvailable(),
  });
  writeFile(resolve(runPath, 'phase1-report.md'), phase1.markdown);

  const diffFingerprint = completeDiffFingerprint(mergeBase, headSha);
  const previousReceipt = latestReceiptPath(root);
  const staleReceipt =
    previousReceipt && existsSync(previousReceipt)
      ? isReceiptStale(readFileSync(previousReceipt, 'utf8'), diffFingerprint)
      : false;

  if (phase1.judgeUnavailable) {
    writeFile(
      resolve(runPath, 'results-baseline.md'),
      '# Baseline Scenario Results\n\nStatus: BLOCKED\n\nReason: phase 1 blocked because independent judge is unavailable.\n',
    );
    writeFile(
      resolve(runPath, 'results-current.md'),
      '# Current Scenario Results\n\nStatus: BLOCKED\n\nReason: phase 1 blocked because independent judge is unavailable.\n',
    );
    writeFile(
      resolve(runPath, 'judge-report.md'),
      [
        '# Judge Report',
        '',
        'Status: BLOCKED',
        '',
        'Reason: independent judge is unavailable.',
        staleReceipt
          ? 'Stale receipt detected: prior receipt does not match current diff fingerprint.'
          : '',
        '',
      ].join('\n'),
    );
    pruneRuns(root);
    process.exitCode = 1;
    return;
  }

  if (phase1.findings.length > 0) {
    writeFile(
      resolve(runPath, 'results-baseline.md'),
      '# Baseline Scenario Results\n\nStatus: BLOCKED\n\nReason: phase 1 structural findings detected.\n',
    );
    writeFile(
      resolve(runPath, 'results-current.md'),
      '# Current Scenario Results\n\nStatus: BLOCKED\n\nReason: phase 1 structural findings detected.\n',
    );
    writeFile(
      resolve(runPath, 'judge-report.md'),
      [
        '# Judge Report',
        '',
        'Status: BLOCKED',
        '',
        'Reason: structural findings in phase 1 must be resolved before behavioral comparison.',
        '',
        'Structural findings:',
        ...phase1.findings.map((finding) => `- ${finding}`),
        '',
      ].join('\n'),
    );
    pruneRuns(root);
    process.exitCode = 1;
    return;
  }

  const baselineRun = runScenarioRunner({
    mode: 'baseline',
    runRoot: runPath,
    surfaceFile: resolve(runPath, 'baseline-snapshot.json'),
    config,
  });
  if (baselineRun.status !== 0) {
    writeFile(
      resolve(runPath, 'judge-report.md'),
      '# Judge Report\n\nStatus: BLOCKED\n\nReason: baseline runner failed.\n',
    );
    pruneRuns(root);
    process.exitCode = 1;
    return;
  }
  writeFile(resolve(runPath, 'results-baseline.md'), baselineRun.stdout);

  const currentRun = runScenarioRunner({
    mode: 'current',
    runRoot: runPath,
    surfaceFile: resolve(runPath, 'current-snapshot.json'),
    config,
  });
  if (currentRun.status !== 0) {
    writeFile(
      resolve(runPath, 'judge-report.md'),
      '# Judge Report\n\nStatus: BLOCKED\n\nReason: current runner failed.\n',
    );
    pruneRuns(root);
    process.exitCode = 1;
    return;
  }
  writeFile(resolve(runPath, 'results-current.md'), currentRun.stdout);

  const scoreFailures = compareScenarioResults(baselineRun.stdout, currentRun.stdout);
  const currentScores = parseScenarioScores(currentRun.stdout);
  if ((currentScores['hallucination-guard'] ?? 0) < 4) {
    scoreFailures.push('Hallucination guard must score 4/4 in current run.');
  }
  if (staleReceipt) {
    scoreFailures.push(
      'Stale receipt rejected: diff fingerprint changed since the latest receipt.',
    );
  }
  const blocked = scoreFailures.length > 0;

  const judgeReport = [
    '# Judge Report',
    '',
    blocked ? 'Status: BLOCKED' : 'Status: PASS',
    '',
    staleReceipt
      ? 'Stale receipt rejected: prior receipt does not match current diff fingerprint.'
      : 'Stale receipt check: clear',
    '',
    'Score comparison findings:',
    ...(scoreFailures.length > 0 ? scoreFailures.map((finding) => `- ${finding}`) : ['- none']),
    '',
  ].join('\n');

  writeFile(resolve(runPath, 'judge-report.md'), judgeReport);

  if (!blocked) {
    const receipt = [
      'EVAL PASS',
      `Base: ${mergeBase}`,
      `Head: ${headSha}`,
      `Diff: ${diffFingerprint}`,
    ].join('\n');
    writeFile(resolve(runPath, 'pass-receipt.txt'), receipt);
  }

  pruneRuns(root);
  process.exitCode = blocked ? 1 : 0;
}

main();
