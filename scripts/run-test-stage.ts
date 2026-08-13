import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function hasFiles(directory: string, predicate: (name: string) => boolean): boolean {
  if (!existsSync(directory)) return false;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      if (hasFiles(path, predicate)) return true;
    } else if (predicate(path)) {
      return true;
    }
  }
  return false;
}

function matchingFiles(directory: string, predicate: (name: string) => boolean): string[] {
  if (!existsSync(directory)) return [];
  const matches: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      matches.push(...matchingFiles(path, predicate));
    } else if (predicate(path)) {
      matches.push(path);
    }
  }
  return matches;
}

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const stage = process.argv[2];
if (stage === 'integration') {
  if (!hasFiles('tests/integration', (file) => file.endsWith('.test.ts'))) {
    console.log('NOT APPLICABLE integration tests: no integration specifications found');
  } else {
    run('pnpm', ['exec', 'vitest', 'run', 'tests/integration']);
  }
} else if (stage === 'e2e' || stage === 'a11y') {
  const hasUi = hasFiles('apps', (file) => /\.(tsx|jsx|vue|svelte)$/.test(file));
  const suffix = stage === 'a11y' ? '.a11y.spec.ts' : '.e2e.spec.ts';
  const specs = matchingFiles('tests/e2e', (file) => file.endsWith(suffix));
  const hasSpecs = specs.length > 0;
  if (!hasUi && !hasSpecs) {
    console.log(`NOT APPLICABLE ${stage}: no UI components or ${suffix} specifications found`);
  } else if (!hasSpecs) {
    throw new Error(
      `BLOCKED HC-${stage === 'a11y' ? 'A11Y-001' : 'TEST-001'} missing ${suffix} coverage for UI code`,
    );
  } else {
    if (
      stage === 'a11y' &&
      !specs.some((file) => readFileSync(file, 'utf8').includes('@axe-core/playwright'))
    ) {
      console.warn('WARN SC-A11Y-001 accessibility specifications do not use @axe-core/playwright');
    }
    run('pnpm', ['exec', 'playwright', 'test', `tests/e2e/**/*${suffix}`]);
  }
} else if (stage === 'ai') {
  if (!hasFiles('services/ai-orchestration/evaluations', (file) => file.endsWith('.test.ts'))) {
    console.log('NOT APPLICABLE AI evaluations: no AI evaluation specifications found');
  } else {
    run('pnpm', ['--filter', '@hexagone/ai-orchestration', 'evaluate']);
  }
} else {
  throw new Error('usage: tsx scripts/run-test-stage.ts <integration|e2e|a11y|ai>');
}
