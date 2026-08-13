import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function changedFiles(): string[] {
  try {
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : undefined;
    const range = base ? `${base}...HEAD` : 'HEAD~1...HEAD';
    return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', range], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasTest(directory: string): boolean {
  if (!existsSync(directory)) return false;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      if (hasTest(path)) return true;
    } else if (/\.(test|spec)\.ts$/.test(path)) {
      return true;
    }
  }
  return false;
}

const changed = changedFiles();
if (changed.length === 0) {
  console.log('NOT APPLICABLE HC-TEST-001 mapping: Git diff is unavailable');
  process.exit(0);
}

const production = changed.filter(
  (file) =>
    /^(apps|services|packages)\/[^/]+\/src\/.+\.ts$/.test(file) && !file.endsWith('.test.ts'),
);
for (const source of production) {
  const [area, workspace] = source.split('/');
  const workspaceRoot = `${area}/${workspace}`;
  const mapped = hasTest(`${workspaceRoot}/test`) || hasTest(`${workspaceRoot}/tests`);
  const repositoryMapped = hasTest(`tests/${area}/${workspace}`) || hasTest(`tests/${workspace}`);
  if (!mapped && !repositoryMapped) {
    throw new Error(`BLOCKED HC-TEST-001 no focused tests mapped to changed source: ${source}`);
  }
}
console.log(
  `PASS HC-TEST-001 mapping: ${production.length} changed production files mapped to tests`,
);
