import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, dirname, extname, join } from 'node:path';
import { parse } from 'yaml';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);

function filesIn(directory: string, includeBuildArtifacts = false): string[] {
  const absoluteDirectory = resolve(root, directory);
  if (!existsSync(absoluteDirectory)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteDirectory)) {
    const allowedArtifactDirectory =
      includeBuildArtifacts && (entry === 'dist' || entry === 'build');
    if (ignoredDirectories.has(entry) && !allowedArtifactDirectory) continue;
    const absolutePath = join(absoluteDirectory, entry);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...filesIn(relative(root, absolutePath), includeBuildArtifacts));
    } else {
      files.push(relative(root, absolutePath));
    }
  }
  return files;
}

function text(file: string): string {
  return readFileSync(resolve(root, file), 'utf8');
}

function fail(message: string): never {
  throw new Error(`BLOCKED ${message}`);
}

const decisionReadinessHeaders = [
  'Decision ID',
  'Current evidence',
  'Missing business input',
  'Options',
  'Decision owner',
  'Required POC',
  'Status',
  'Review date',
] as const;

export function validateDecisionReadinessRegister(content: string): void {
  const lines = content.split('\n');
  const headerLineIndex = lines.findIndex(
    (line) =>
      line.trim().startsWith('|') &&
      decisionReadinessHeaders.every((header) => line.includes(header)),
  );
  if (headerLineIndex < 0) {
    fail('HC-DOC-001 decision-readiness register is missing the required table header');
  }

  const rows: string[][] = [];
  for (let i = headerLineIndex + 2; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) break;
    if (!trimmed.startsWith('|')) break;
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== decisionReadinessHeaders.length) {
      fail('HC-DOC-001 decision-readiness register row does not match required column count');
    }
    rows.push(cells);
  }

  if (rows.length === 0) {
    fail('HC-DOC-001 decision-readiness register must include at least one decision entry');
  }

  for (const [index, row] of rows.entries()) {
    row.forEach((value, columnIndex) => {
      if (!value || value === '-') {
        fail(
          `HC-DOC-001 decision-readiness register has an incomplete value at row ${index + 1}, column '${decisionReadinessHeaders[columnIndex]}'`,
        );
      }
    });
  }
}

function checkPolicy(): void {
  const file = 'docs/methodology/CONSTITUTION.md';
  const content = text(file);
  const ids = [...content.matchAll(/\b(?:HC|SC)-[A-Z0-9]+-\d{3}\b/g)].map((match) => match[0]);
  if (ids.length !== new Set(ids).size) fail('duplicate HC-* or SC-* identifiers');

  const required = [
    'HC-SEC-001',
    'HC-SEC-002',
    'HC-TYPE-001',
    'HC-ARCH-001',
    'HC-ARCH-002',
    'HC-AI-001',
    'HC-TEST-001',
    'HC-DEP-001',
    'HC-DOC-001',
    'HC-GOV-001',
    'HC-GIT-001',
  ];
  for (const id of required) {
    if (!ids.includes(id)) fail(`missing canonical rule ${id}`);
  }

  for (const heading of [
    '## Hard constraints',
    '## Measurable non-blocking goals',
    '## Required implementation workflow',
    '## Evidence requirements',
    '## Amendment and exceptions',
  ]) {
    if (!content.includes(heading)) fail(`missing constitution section: ${heading}`);
  }

  const entryLines = content.split('\n').filter((line) => /\| (?:HC|SC)-/.test(line));
  for (const line of entryLines) {
    if (line.split('|').length < 6) fail(`incomplete rule inventory entry: ${line}`);
  }
  const known = new Set(ids);
  const referenceFiles = filesIn('.').filter(
    (file) => /\.(md|ts|yaml|yml|json)$/.test(file) && !file.startsWith('evidence/'),
  );
  for (const file of referenceFiles) {
    for (const match of text(file).matchAll(/\b(?:HC|SC)-[A-Z0-9]+-\d{3}\b/g)) {
      if (!known.has(match[0])) fail(`HC-GOV-001 unknown rule reference ${match[0]} in ${file}`);
    }
  }
  for (const instruction of [
    '.github/instructions/backend.instructions.md',
    '.github/instructions/contracts.instructions.md',
    '.github/instructions/ui.instructions.md',
    '.github/instructions/ai.instructions.md',
    '.github/instructions/infrastructure.instructions.md',
    '.github/instructions/governance.instructions.md',
  ]) {
    if (!existsSync(resolve(root, instruction)) || !text(instruction).includes('applyTo:')) {
      fail(`HC-GOV-001 missing or unrouted scoped instruction: ${instruction}`);
    }
  }
  const mergePolicy = parse(text('policies/merge.yaml')) as {
    canonical_rule?: unknown;
    direct_push_to_main?: unknown;
    required_approvals?: unknown;
    required_checks?: unknown;
  };
  if (
    mergePolicy.canonical_rule !== 'HC-GOV-001' ||
    mergePolicy.direct_push_to_main !== false ||
    !Array.isArray(mergePolicy.required_approvals) ||
    !mergePolicy.required_approvals.includes('codeowner') ||
    !Array.isArray(mergePolicy.required_checks)
  ) {
    fail('HC-GOV-001 retained merge policy is incomplete or inconsistent');
  }
  console.log(`PASS governance policy: ${ids.length} unique rule identifiers`);
}

function checkArchitecture(): void {
  const sourceFiles = filesIn('services')
    .concat(filesIn('apps'), filesIn('packages'))
    .filter((file) => file.endsWith('.ts'));
  const prohibitedDomainSegments = ['/infrastructure/', '/adapters/', '/transport/'];
  const providerPattern =
    /from\s+['"](?:openai|@anthropic-ai|@azure\/openai|@google\/generative-ai)['"]/;

  for (const file of sourceFiles) {
    const content = text(file);
    if (
      file.includes('/domain/') &&
      prohibitedDomainSegments.some((segment) => content.includes(segment))
    ) {
      fail(`HC-ARCH-001 domain import crosses an adapter boundary: ${file}`);
    }
    if (!file.startsWith('services/ai-orchestration/') && providerPattern.test(content)) {
      fail(`HC-ARCH-001 direct model-provider import outside ai-orchestration: ${file}`);
    }
    const service = file.split('/')[1];
    const serviceImport = /from\s+['"][^'"]*services\/([^/'"]+)/g;
    for (const match of content.matchAll(serviceImport)) {
      if (match[1] !== service)
        fail(`HC-ARCH-001 cross-service source import in ${file}: ${match[0]}`);
    }
  }
  console.log(`PASS architecture boundaries: ${sourceFiles.length} TypeScript files inspected`);
}

function checkContracts(): void {
  const schemas = filesIn('contracts').filter((file) => file.endsWith('.schema.json'));
  if (schemas.length === 0) fail('HC-ARCH-002 no versioned contract schemas found');

  for (const file of schemas) {
    const schema = JSON.parse(text(file)) as {
      title?: unknown;
      type?: unknown;
      required?: unknown;
      properties?: unknown;
    };
    if (typeof schema.title !== 'string' || !/\.v\d+$/.test(schema.title)) {
      fail(`HC-ARCH-002 schema title must end with a version: ${file}`);
    }
    if (
      schema.type !== 'object' ||
      !Array.isArray(schema.required) ||
      typeof schema.properties !== 'object' ||
      schema.properties === null
    ) {
      fail(`HC-ARCH-002 invalid object schema structure: ${file}`);
    }
    const properties = schema.properties as Record<string, unknown>;
    for (const requiredProperty of schema.required) {
      if (typeof requiredProperty !== 'string' || !(requiredProperty in properties)) {
        fail(`HC-ARCH-002 required property is not defined in ${file}`);
      }
    }
  }
  const openApiFiles = filesIn('contracts').filter((file) => /\.v\d+\.ya?ml$/.test(file));
  for (const file of openApiFiles) {
    const document = parse(text(file)) as {
      openapi?: unknown;
      info?: { version?: unknown };
      paths?: unknown;
    };
    if (
      typeof document.openapi !== 'string' ||
      typeof document.info?.version !== 'string' ||
      typeof document.paths !== 'object' ||
      document.paths === null
    ) {
      fail(`HC-ARCH-002 invalid OpenAPI document structure: ${file}`);
    }
  }
  console.log(
    `PASS contract schemas: ${schemas.length} event schemas and ${openApiFiles.length} OpenAPI documents validated`,
  );
}

function checkTypeSafety(): void {
  const productionFiles = filesIn('apps')
    .concat(filesIn('services'), filesIn('packages'))
    .filter(
      (file) => file.endsWith('.ts') && !file.includes('/test/') && !file.endsWith('.test.ts'),
    );
  for (const file of productionFiles) {
    text(file)
      .split('\n')
      .forEach((line, index) => {
        if (/\b(?:as\s+any|:\s*any\b)/.test(line) && !line.includes('HC-TYPE-001: approved')) {
          fail(`HC-TYPE-001 unapproved any escape in ${file}:${index + 1}`);
        }
      });
  }
  console.log(
    `PASS type-safety escapes: ${productionFiles.length} production TypeScript files inspected`,
  );
}

function checkDocs(): void {
  const markdownFiles = ['README.md', 'AGENTS.md', 'CLAUDE.md', '.github/pull_request_template.md']
    .filter((file) => existsSync(resolve(root, file)))
    .concat(filesIn('docs').filter((file) => extname(file) === '.md'));
  const packageManifest = JSON.parse(text('package.json')) as { scripts?: Record<string, unknown> };
  const scripts = packageManifest.scripts ?? {};

  function validateDocumentedPath(owner: string, documentedPath: string): void {
    const optionalGeneratedPaths = new Set(['.env']);
    if (
      documentedPath.includes('*') ||
      documentedPath.includes(' ') ||
      documentedPath.startsWith('http') ||
      documentedPath.startsWith('HC-') ||
      documentedPath.startsWith('SC-')
    ) {
      return;
    }
    if (
      !/^(?:(?:\.github|apps|services|packages|contracts|ai|database|docs|scripts|tests|policies|infrastructure|evidence)\/|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig\.json|eslint\.config\.mjs|vitest\.config\.ts|docker-compose\.yml|\.env\.example|\.env$)/.test(
        documentedPath,
      )
    ) {
      return;
    }
    if (optionalGeneratedPaths.has(documentedPath)) return;
    if (!existsSync(resolve(root, documentedPath))) {
      fail(`HC-DOC-001 documented path does not exist in ${owner}: ${documentedPath}`);
    }
  }

  function validateCommand(owner: string, command: string): void {
    const normalized = command.trim();
    if (!normalized || normalized.startsWith('#')) return;
    const pnpmRun = normalized.match(/^pnpm run ([A-Za-z0-9:_-]+)$/);
    if (pnpmRun) {
      if (!(pnpmRun[1] in scripts))
        fail(`HC-DOC-001 unknown documented script in ${owner}: ${normalized}`);
      return;
    }
    if (
      /^(?:pnpm install --frozen-lockfile|node --version|pnpm --version|docker compose (?:up -d postgres|ps postgres))$/.test(
        normalized,
      )
    ) {
      return;
    }
    const pnpmDirect = normalized.match(/^pnpm ([A-Za-z0-9:_-]+)$/);
    if (pnpmDirect) {
      if (!(pnpmDirect[1] in scripts) && pnpmDirect[1] !== 'install') {
        fail(`HC-DOC-001 unknown documented pnpm command in ${owner}: ${normalized}`);
      }
      return;
    }
    fail(`HC-DOC-001 unsupported documented shell command in ${owner}: ${normalized}`);
  }

  for (const file of markdownFiles) {
    const content = text(file);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      const resolved = resolve(dirname(resolve(root, file)), target);
      if (!existsSync(resolved)) fail(`HC-DOC-001 broken documentation link in ${file}: ${target}`);
    }
    for (const match of content.matchAll(/`([^`\n]+)`/g)) {
      validateDocumentedPath(file, match[1]);
    }
    for (const block of content.matchAll(/```bash\n([\s\S]*?)```/g)) {
      for (const line of block[1].split('\n')) validateCommand(file, line);
    }
  }
  if (!text('docs/README.md').includes('methodology/CONSTITUTION.md')) {
    fail('HC-DOC-001 documentation index does not register the canonical constitution');
  }

  const decisionRegisterPath = 'docs/foundation/decision-readiness-register.md';
  if (!existsSync(resolve(root, decisionRegisterPath))) {
    fail(`HC-DOC-001 missing required decision register: ${decisionRegisterPath}`);
  }
  validateDecisionReadinessRegister(text(decisionRegisterPath));

  console.log(`PASS documentation references: ${markdownFiles.length} Markdown files checked`);
}

function checkLocalization(): void {
  const uiFiles = filesIn('apps').filter((file) => /\.(tsx|jsx|vue|svelte)$/.test(file));
  if (uiFiles.length === 0) {
    console.log('NOT APPLICABLE localization: no UI component files found');
    return;
  }
  const localeFiles = filesIn('apps').filter((file) => /\/locales\/.*\.(json|ts)$/.test(file));
  if (localeFiles.length === 0) {
    console.warn('WARN SC-I18N-001 UI components exist but no locale resources are registered');
    return;
  }
  console.log(
    `PASS localization: ${uiFiles.length} UI files and ${localeFiles.length} locale resources found`,
  );
}

function checkBudgets(): void {
  const policy = JSON.parse(text('policies/artifact-budgets.json')) as {
    defaultBytes: unknown;
    overrides: Record<string, unknown>;
  };
  if (typeof policy.defaultBytes !== 'number' || policy.defaultBytes <= 0) {
    console.warn('WARN SC-PERF-001 artifact budget policy has no positive defaultBytes value');
    return;
  }
  const artifacts = filesIn('.', true).filter((file) => /(^|\/)(dist|build)\//.test(file));
  if (artifacts.length === 0) {
    console.log('NOT APPLICABLE artifact budgets: no build artifacts found');
    return;
  }
  for (const artifact of artifacts) {
    const budget =
      typeof policy.overrides[artifact] === 'number'
        ? (policy.overrides[artifact] as number)
        : policy.defaultBytes;
    if (statSync(resolve(root, artifact)).size > budget) {
      console.warn(`WARN SC-PERF-001 artifact exceeds ${budget} bytes: ${artifact}`);
    }
  }
  console.log(`PASS artifact budgets: ${artifacts.length} artifacts checked`);
}

function checkSecurity(): void {
  const candidateFiles = filesIn('.').filter(
    (file) =>
      !file.startsWith('evidence/releases/') &&
      !file.endsWith('.lock') &&
      !file.endsWith('.png') &&
      !file.endsWith('.jpg') &&
      !file.endsWith('.jpeg'),
  );
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(?:ghp|github_pat)_[A-Za-z0-9_]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
  ];
  for (const file of candidateFiles) {
    const content = text(file);
    if (patterns.some((pattern) => pattern.test(content)))
      fail(`HC-SEC-001 secret pattern detected: ${file}`);
  }
  console.log(`PASS secret patterns: ${candidateFiles.length} files inspected`);
}

if (process.argv[1]?.endsWith('check-governance.ts')) {
  const command = process.argv[2];
  switch (command) {
    case 'policy':
      checkPolicy();
      break;
    case 'architecture':
      checkArchitecture();
      break;
    case 'contracts':
      checkContracts();
      break;
    case 'types':
      checkTypeSafety();
      break;
    case 'docs':
      checkDocs();
      break;
    case 'localization':
      checkLocalization();
      break;
    case 'budgets':
      checkBudgets();
      break;
    case 'security':
      checkSecurity();
      break;
    default:
      fail(
        'usage: tsx scripts/check-governance.ts <policy|architecture|contracts|types|docs|localization|budgets|security>',
      );
  }
}
