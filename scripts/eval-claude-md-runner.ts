import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  calculateBudgets,
  detectHallucinations,
  scoreFromFindings,
  toMarkdownScores,
  type EvalBudget,
  type ScenarioScore,
} from './eval-claude-md-lib.js';

interface RunnerInput {
  surfaceFile: string;
  promptDirectory: string;
  budget: EvalBudget;
  eagerFiles: string[];
  pathScopedFiles: string[];
  mode: 'baseline' | 'current';
}

interface SurfaceSnapshot {
  files: Record<string, { exists: boolean; bytes: number; content: string }>;
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const abs = resolve(root, entry);
    if (statSync(abs).isDirectory()) {
      out.push(...listFiles(abs));
      continue;
    }
    out.push(abs);
  }
  return out;
}

function parseArgs(argv: string[]): RunnerInput {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const mode = get('--mode');
  if (mode !== 'baseline' && mode !== 'current') {
    throw new Error('Runner mode must be baseline or current');
  }

  const surfaceFile = get('--surface-file');
  const promptDirectory = get('--prompt-directory');
  const budgetFile = get('--budget-file');
  const eagerFile = get('--eager-file');
  const pathScopedFile = get('--path-scoped-file');

  if (!surfaceFile || !promptDirectory || !budgetFile || !eagerFile || !pathScopedFile) {
    throw new Error('Missing required runner arguments');
  }

  return {
    mode,
    surfaceFile,
    promptDirectory,
    budget: JSON.parse(readFileSync(budgetFile, 'utf8')) as EvalBudget,
    eagerFiles: JSON.parse(readFileSync(eagerFile, 'utf8')) as string[],
    pathScopedFiles: JSON.parse(readFileSync(pathScopedFile, 'utf8')) as string[],
  };
}

function readKnownSymbols(snapshot: SurfaceSnapshot): Set<string> {
  const symbols = new Set<string>();
  for (const file of Object.values(snapshot.files)) {
    for (const line of file.content.split('\n')) {
      const match = line.match(/\b(?:export\s+)?(?:function|class|interface|const|type)\s+([A-Za-z0-9_]+)/);
      if (match) symbols.add(match[1]);
    }
  }
  return symbols;
}

function scoreDiscovery(prompts: string[]): ScenarioScore {
  const required = [
    'eval-claude-md.prompt.md',
    'constitute.prompt.md',
    'reflect.prompt.md',
    'audit.prompt.md',
    'verify.prompt.md',
    'review-pr.prompt.md',
  ];
  const promptNames = new Set(prompts.map((file) => file.split('/').pop() ?? file));
  const missing = required.filter((requiredName) => !promptNames.has(requiredName));
  return scoreFromFindings('workflow-discovery', missing.map((name) => `Missing prompt: ${name}`));
}

function scoreSurface(snapshot: SurfaceSnapshot): ScenarioScore {
  const missing = Object.entries(snapshot.files)
    .filter(([, value]) => !value.exists)
    .map(([file]) => `Missing instruction surface file: ${file}`);
  return scoreFromFindings('instruction-surface-integrity', missing);
}

function scoreBudget(snapshot: SurfaceSnapshot, input: RunnerInput): ScenarioScore {
  const sizes: Record<string, number> = {};
  for (const [file, value] of Object.entries(snapshot.files)) {
    sizes[file] = value.exists ? value.bytes : 0;
  }
  const result = calculateBudgets({
    eagerFiles: input.eagerFiles,
    pathScopedFiles: input.pathScopedFiles,
    fileSizes: sizes,
    budget: input.budget,
  });
  return scoreFromFindings('budget-compliance', result.failures);
}

function scoreHallucinations(snapshot: SurfaceSnapshot, prompts: string[]): ScenarioScore {
  const knownFiles = new Set(Object.keys(snapshot.files));
  prompts.forEach((prompt) => {
    const normalized = prompt.replace(`${process.cwd()}/`, '');
    knownFiles.add(normalized);
  });

  const knownCommands = new Set(['pnpm run', 'pnpm test', 'pnpm lint', 'pnpm build', 'pnpm format']);
  const knownSymbols = readKnownSymbols(snapshot);

  const findings: string[] = [];
  for (const promptPath of prompts) {
    const content = readFileSync(promptPath, 'utf8');
    findings.push(
      ...detectHallucinations({
        text: content,
        knownFiles,
        knownCommands,
        knownSymbols,
      }),
    );
  }

  return scoreFromFindings('hallucination-guard', findings);
}

export function runScenarios(input: RunnerInput): ScenarioScore[] {
  if (!existsSync(input.surfaceFile)) {
    throw new Error(`Surface snapshot is missing: ${input.surfaceFile}`);
  }
  if (!existsSync(input.promptDirectory)) {
    throw new Error(`Prompt directory is missing: ${input.promptDirectory}`);
  }

  const snapshot = JSON.parse(readFileSync(input.surfaceFile, 'utf8')) as SurfaceSnapshot;
  const prompts = listFiles(resolve(process.cwd(), input.promptDirectory)).filter((file) =>
    file.endsWith('.prompt.md'),
  );

  return [
    scoreDiscovery(prompts),
    scoreSurface(snapshot),
    scoreBudget(snapshot, input),
    scoreHallucinations(snapshot, prompts),
  ];
}

function main(): void {
  const input = parseArgs(process.argv);
  const scores = runScenarios(input);
  const markdown = toMarkdownScores(
    input.mode === 'baseline' ? 'Baseline Scenario Results' : 'Current Scenario Results',
    scores,
  );
  process.stdout.write(markdown);
}

main();
