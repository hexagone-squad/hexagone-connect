import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { evaluateSourcePolicy, type SourcePolicyFile } from './source-policy.js';

const root = process.cwd();
const browserApps = [
  'apps/admin-portal',
  'apps/inspection-app',
  'apps/provider-portal',
  'apps/public-web',
];

function sourceFiles(directory: string): SourcePolicyFile[] {
  const absolute = resolve(root, directory);
  if (!existsSync(absolute)) return [];
  const files: SourcePolicyFile[] = [];
  for (const entry of readdirSync(absolute)) {
    const path = join(absolute, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(relative(root, path)));
    } else if (/\.[cm]?[jt]sx?$/.test(entry) && !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry)) {
      files.push({ path: relative(root, path), content: readFileSync(path, 'utf8') });
    }
  }
  return files;
}

const files = browserApps.flatMap((app) => sourceFiles(`${app}/src`));
const manifests = Object.fromEntries(
  browserApps
    .map((app) => `${app}/package.json`)
    .filter((path) => existsSync(resolve(root, path)))
    .map((path) => [path, readFileSync(resolve(root, path), 'utf8')]),
);
const servicePackages = readdirSync(resolve(root, 'services'))
  .map((service) => resolve(root, 'services', service, 'package.json'))
  .filter(existsSync)
  .map((manifest) => JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown })
  .flatMap((manifest) => (typeof manifest.name === 'string' ? [manifest.name] : []));

const result = evaluateSourcePolicy({ files, manifests, servicePackages });
for (const report of result.reports) console.log(`REPORT ${report}`);
if (result.violations.length > 0) {
  for (const violation of result.violations) {
    console.error(`BLOCKED ${violation.rule} ${violation.path}: ${violation.message}`);
  }
  process.exit(1);
}
console.log(
  `PASS source policy: ${files.length} browser source files, ${result.reports.length} maintainability findings`,
);
