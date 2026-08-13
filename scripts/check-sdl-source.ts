import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface SdlFinding {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

const SOURCE_ROOTS = ['apps', 'services', 'packages', 'scripts', 'ai'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function fail(message: string): never {
  throw new Error(`BLOCKED HC-SEC-001 ${message}`);
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === 'coverage') {
      continue;
    }
    const absolutePath = join(root, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    if (SOURCE_EXTENSIONS.some((extension) => absolutePath.endsWith(extension))) {
      files.push(absolutePath);
    }
  }
  return files;
}

export function scanSdlRisks(files: Array<{ path: string; content: string }>): SdlFinding[] {
  const findings: SdlFinding[] = [];

  const rules: Array<{ rule: string; regex: RegExp; detail: string }> = [
    {
      rule: 'SDL-001',
      regex: /\beval\s*\(/,
      detail: 'Avoid eval(); use explicit parsers or safer control flow.',
    },
    {
      rule: 'SDL-002',
      regex: /\bnew\s+Function\s*\(/,
      detail: 'Avoid dynamic function construction from strings.',
    },
    {
      rule: 'SDL-003',
      regex: /\bvm\.(runInNewContext|runInThisContext|Script)\s*\(/,
      detail: 'Avoid runtime code execution with node:vm for untrusted input paths.',
    },
    {
      rule: 'SDL-004',
      regex: /\bexec\s*\(/,
      detail: 'Avoid child_process.exec(); use execFile/spawn with explicit arguments.',
    },
    {
      rule: 'SDL-005',
      regex: /shell\s*:\s*true/,
      detail:
        'Avoid shell:true in process execution options unless fully controlled and documented.',
    },
  ];

  for (const file of files) {
    const lines = file.content.split('\n');
    let allowNextLine = false;
    lines.forEach((line, index) => {
      if (line.trim().startsWith('// SDL-ALLOW')) {
        allowNextLine = true;
        return;
      }
      if (allowNextLine) {
        allowNextLine = false;
        return;
      }
      for (const rule of rules) {
        if (rule.regex.test(line)) {
          findings.push({
            file: file.path,
            line: index + 1,
            rule: rule.rule,
            detail: rule.detail,
          });
        }
      }
    });
  }

  return findings;
}

if (process.argv[1]?.endsWith('check-sdl-source.ts')) {
  const root = process.cwd();
  const candidateFiles = SOURCE_ROOTS.flatMap((folder) => walkFiles(resolve(root, folder)))
    .map((absolutePath) => ({
      path: absolutePath.replace(`${root}/`, ''),
      content: readFileSync(absolutePath, 'utf8'),
    }))
    .filter((file) => file.path !== 'scripts/check-sdl-source.ts');

  if (candidateFiles.length === 0) {
    fail('no source files found for SDL scan; cannot establish source-analysis coverage');
  }

  const findings = scanSdlRisks(candidateFiles);
  if (findings.length > 0) {
    const output = findings
      .slice(0, 25)
      .map((finding) => `${finding.file}:${finding.line} ${finding.rule} ${finding.detail}`)
      .join('\n');
    throw new Error(`BLOCKED HC-SEC-001 SDL source-analysis findings:\n${output}`);
  }

  console.log(`PASS SDL source analysis: ${candidateFiles.length} source files scanned`);
}
