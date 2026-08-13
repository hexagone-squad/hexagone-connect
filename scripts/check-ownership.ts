import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface CodeownersEntry {
  pattern: string;
  owners: string[];
  line: number;
}

function fail(message: string): never {
  throw new Error(`BLOCKED HC-GOV-001 ${message}`);
}

export function parseCodeowners(content: string): CodeownersEntry[] {
  const entries: CodeownersEntry[] = [];
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (!raw || raw.startsWith('#')) continue;

    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      fail(`invalid CODEOWNERS syntax at line ${index + 1}: expected pattern and owner`);
    }

    const pattern = tokens[0];
    const owners = tokens.slice(1);
    for (const owner of owners) {
      if (!owner.startsWith('@')) {
        fail(`invalid owner '${owner}' at line ${index + 1}: owners must start with '@'`);
      }
    }

    entries.push({ pattern, owners, line: index + 1 });
  }

  return entries;
}

function staticPatternPrefix(pattern: string): string {
  if (pattern === '*') return '';
  const normalized = pattern.replace(/^\//, '');
  const wildcard = [...normalized].findIndex(
    (character) => character === '*' || character === '?' || character === '[',
  );
  const prefix = wildcard === -1 ? normalized : normalized.slice(0, wildcard);
  return prefix.replace(/\/[^/]*$/, (segment) => (segment.includes('.') ? segment : '/'));
}

export function validateCodeownersEntries(
  entries: CodeownersEntry[],
  pathExists: (relativePath: string) => boolean,
): void {
  if (entries.length === 0) fail('CODEOWNERS must define at least one ownership rule');

  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.pattern}|${entry.owners.join(' ')}`;
    if (seen.has(key)) {
      fail(`duplicate CODEOWNERS rule at line ${entry.line}: ${entry.pattern}`);
    }
    seen.add(key);

    const prefix = staticPatternPrefix(entry.pattern);
    if (!prefix) continue;

    const candidate = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    if (!candidate) continue;
    if (!pathExists(candidate)) {
      fail(
        `CODEOWNERS path does not exist at line ${entry.line}: ${entry.pattern} (checked: ${candidate})`,
      );
    }
  }

  const catchAll = entries.find((entry) => entry.pattern === '*');
  if (!catchAll) {
    fail("missing catch-all CODEOWNERS rule '*' to ensure repository-wide ownership");
  }
  if (catchAll.owners.length === 0) {
    fail("catch-all CODEOWNERS rule '*' must include at least one owner");
  }
}

if (process.argv[1]?.endsWith('check-ownership.ts')) {
  const codeownersPath = resolve(process.cwd(), '.github/CODEOWNERS');
  if (!existsSync(codeownersPath)) {
    fail('missing .github/CODEOWNERS file');
  }

  const content = readFileSync(codeownersPath, 'utf8');
  const entries = parseCodeowners(content);
  validateCodeownersEntries(entries, (relativePath) =>
    existsSync(resolve(process.cwd(), relativePath)),
  );

  console.log(`PASS ownership policy: ${entries.length} CODEOWNERS rules validated`);
}
