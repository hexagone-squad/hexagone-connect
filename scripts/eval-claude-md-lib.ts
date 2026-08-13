import { createHash } from 'node:crypto';

export interface EvalBudget {
  maxEagerFiles: number;
  maxEagerBytes: number;
  maxPathScopedFiles: number;
  maxPathScopedBytes: number;
}

export interface BudgetUsage {
  eagerFiles: number;
  eagerBytes: number;
  pathScopedFiles: number;
  pathScopedBytes: number;
}

export interface BudgetResult {
  usage: BudgetUsage;
  withinBudget: boolean;
  failures: string[];
}

export interface ScenarioScore {
  id: string;
  score: number;
  reason: string;
}

export interface ParsedReceipt {
  pass: boolean;
  base: string;
  head: string;
  diff: string;
}

export function resolveDefaultBranchFromSymbolicRef(symbolicRef: string): string {
  const prefix = 'refs/remotes/origin/';
  if (!symbolicRef.startsWith(prefix)) {
    throw new Error(`Unsupported symbolic ref: ${symbolicRef}`);
  }
  const branch = symbolicRef.slice(prefix.length).trim();
  if (!branch) throw new Error('Default branch is empty');
  return branch;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function buildDiffFingerprint(parts: {
  committed: string;
  staged: string;
  unstaged: string;
  untracked: Array<{ path: string; content: string }>;
}): string {
  const untracked = parts.untracked
    .map((file) => `path=${file.path}\nsha=${sha256(file.content)}\n`)
    .join('\n');
  return sha256(
    [
      'committed',
      parts.committed,
      'staged',
      parts.staged,
      'unstaged',
      parts.unstaged,
      'untracked',
      untracked,
    ].join('\n'),
  );
}

export function calculateBudgets(params: {
  eagerFiles: string[];
  pathScopedFiles: string[];
  fileSizes: Record<string, number>;
  budget: EvalBudget;
}): BudgetResult {
  const eagerSet = new Set(params.eagerFiles);
  const pathScopedUnique = params.pathScopedFiles.filter((file) => !eagerSet.has(file));

  const eagerBytes = params.eagerFiles.reduce(
    (sum, file) => sum + (params.fileSizes[file] ?? 0),
    0,
  );
  const pathScopedBytes = pathScopedUnique.reduce(
    (sum, file) => sum + (params.fileSizes[file] ?? 0),
    0,
  );

  const usage: BudgetUsage = {
    eagerFiles: params.eagerFiles.length,
    eagerBytes,
    pathScopedFiles: pathScopedUnique.length,
    pathScopedBytes,
  };

  const failures: string[] = [];
  if (usage.eagerFiles > params.budget.maxEagerFiles) {
    failures.push(`eager file count ${usage.eagerFiles} exceeds ${params.budget.maxEagerFiles}`);
  }
  if (usage.eagerBytes > params.budget.maxEagerBytes) {
    failures.push(`eager bytes ${usage.eagerBytes} exceeds ${params.budget.maxEagerBytes}`);
  }
  if (usage.pathScopedFiles > params.budget.maxPathScopedFiles) {
    failures.push(
      `path-scoped file count ${usage.pathScopedFiles} exceeds ${params.budget.maxPathScopedFiles}`,
    );
  }
  if (usage.pathScopedBytes > params.budget.maxPathScopedBytes) {
    failures.push(
      `path-scoped bytes ${usage.pathScopedBytes} exceeds ${params.budget.maxPathScopedBytes}`,
    );
  }

  return {
    usage,
    withinBudget: failures.length === 0,
    failures,
  };
}

export function parseReceipt(content: string): ParsedReceipt {
  const lines = content.trim().split('\n');
  if (lines.length !== 4 || lines[0] !== 'EVAL PASS') {
    throw new Error('Receipt format is invalid');
  }
  if (
    !lines[1].startsWith('Base: ') ||
    !lines[2].startsWith('Head: ') ||
    !lines[3].startsWith('Diff: ')
  ) {
    throw new Error('Receipt format is invalid');
  }
  return {
    pass: true,
    base: lines[1].slice('Base: '.length),
    head: lines[2].slice('Head: '.length),
    diff: lines[3].slice('Diff: '.length),
  };
}

export function isReceiptStale(content: string, currentDiffFingerprint: string): boolean {
  const receipt = parseReceipt(content);
  return receipt.diff !== currentDiffFingerprint;
}

export function pruneRunFolders<T extends { path: string; createdAt: number }>(
  folders: T[],
  keepCount: number,
): { keep: T[]; remove: T[] } {
  const sorted = [...folders].sort((a, b) => b.createdAt - a.createdAt);
  return {
    keep: sorted.slice(0, keepCount),
    remove: sorted.slice(keepCount),
  };
}

export function detectFalseImplementsClaims(
  markdown: string,
  existingPaths: Set<string>,
): string[] {
  const findings: string[] = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(/Implements\s*:\s*`?([^`]+)`?/i);
    if (!match) continue;
    const claimed = match[1].trim();
    if (!existingPaths.has(claimed)) {
      findings.push(`False Implements claim: ${claimed}`);
    }
  }
  return findings;
}

export function detectNumericRulesWithoutEnforcement(markdown: string): string[] {
  const findings: string[] = [];
  for (const line of markdown.split('\n')) {
    const hasNumericRequirement = /\b(?:at least|at most|no more than|\d+)\b/i.test(line);
    const hasConstraintVerb = /\b(?:must|require|required|shall|enforce)\b/i.test(line);
    const hasEnforcementHint = /`(?:pnpm|npm|tsx|node|gh|git)\b|check:|test:/i.test(line);
    if (hasNumericRequirement && hasConstraintVerb && !hasEnforcementHint) {
      findings.push(`Numeric rule without executable enforcement: ${line.trim()}`);
    }
  }
  return findings;
}

export function detectCombinedConstraintRules(markdown: string): string[] {
  const findings: string[] = [];
  const categories: Array<{ key: string; regex: RegExp }> = [
    { key: 'security', regex: /\bsecurity|secret|auth|privacy\b/i },
    { key: 'performance', regex: /\bperformance|latency|budget\b/i },
    { key: 'docs', regex: /\bdocument|docs|readme\b/i },
    { key: 'tests', regex: /\btest|coverage|verification\b/i },
    { key: 'architecture', regex: /\barchitecture|boundary|dependency\b/i },
  ];

  for (const line of markdown.split('\n')) {
    if (!/\band\b/i.test(line) || !/\b(?:must|required|shall)\b/i.test(line)) continue;
    const matches = categories.filter((category) => category.regex.test(line));
    if (matches.length >= 2) {
      findings.push(
        `Rule combines unrelated constraints (${matches.map((match) => match.key).join(', ')}): ${line.trim()}`,
      );
    }
  }
  return findings;
}

export function detectHallucinations(params: {
  text: string;
  knownFiles: Set<string>;
  knownCommands: Set<string>;
  knownSymbols: Set<string>;
}): string[] {
  const findings: string[] = [];
  const inlineCode = [...params.text.matchAll(/`([^`]+)`/g)].map((match) => match[1].trim());

  for (const token of inlineCode) {
    if (!token) continue;
    if (
      token.includes('/') ||
      token.endsWith('.md') ||
      token.endsWith('.ts') ||
      token.endsWith('.json')
    ) {
      if (!params.knownFiles.has(token)) findings.push(`Hallucinated file reference: ${token}`);
      continue;
    }

    if (/^(?:pnpm|npm|tsx|node|gh|git)\b/.test(token)) {
      const commandHead = token.split(' ').slice(0, 3).join(' ');
      const isKnown = [...params.knownCommands].some((known) => commandHead.startsWith(known));
      if (!isKnown) findings.push(`Hallucinated command reference: ${token}`);
      continue;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token) && !params.knownSymbols.has(token)) {
      findings.push(`Hallucinated symbol reference: ${token}`);
    }
  }

  return findings;
}

export function scoreFromFindings(id: string, findings: string[]): ScenarioScore {
  if (findings.length === 0) return { id, score: 4, reason: 'No findings' };
  if (findings.length === 1) return { id, score: 3, reason: findings.join('; ') };
  if (findings.length <= 3) return { id, score: 2, reason: findings.join('; ') };
  if (findings.length <= 5) return { id, score: 1, reason: findings.join('; ') };
  return { id, score: 0, reason: findings.join('; ') };
}

export function toMarkdownScores(title: string, scores: ScenarioScore[]): string {
  const rows = scores
    .map((score) => `| ${score.id} | ${score.score} | ${score.reason.replace(/\|/g, '/')} |`)
    .join('\n');
  return [
    `# ${title}`,
    '',
    '| Scenario | Score (0-4) | Reason |',
    '| --- | --- | --- |',
    rows,
    '',
  ].join('\n');
}
