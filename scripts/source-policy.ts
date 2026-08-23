import { dirname, posix } from 'node:path';

export interface SourcePolicyFile {
  path: string;
  content: string;
}

export interface SourcePolicyInput {
  files: SourcePolicyFile[];
  manifests: Record<string, string>;
  servicePackages: string[];
}

export interface SourcePolicyViolation {
  rule: 'HC-ARCH-003' | 'HC-ARCH-004' | 'HC-UI-001';
  path: string;
  message: string;
}

export interface SourcePolicyResult {
  violations: SourcePolicyViolation[];
  reports: string[];
}

const browserApps = new Set([
  'apps/admin-portal',
  'apps/inspection-app',
  'apps/provider-portal',
  'apps/public-web',
]);

function appRoot(file: string): string | undefined {
  const match = file.match(/^(apps\/[^/]+)/);
  return match && browserApps.has(match[1]) ? match[1] : undefined;
}

function importSpecifiers(content: string): string[] {
  return [...content.matchAll(/(?:from\s+|import\s*\(|import\s+)\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
}

function featureIdentity(file: string): { app: string; feature: string } | undefined {
  const match = file.match(/^(apps\/[^/]+)\/src\/features\/([^/]+)\//);
  return match ? { app: match[1], feature: match[2] } : undefined;
}

function featureImportTarget(
  sourcePath: string,
  specifier: string,
): { app: string; feature: string; remainder: string } | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const resolved = posix.normalize(posix.join(dirname(sourcePath), specifier));
  const match = resolved.match(/^(apps\/[^/]+)\/src\/features\/([^/]+)(\/.*)?$/);
  return match ? { app: match[1], feature: match[2], remainder: match[3] ?? '' } : undefined;
}

export function evaluateSourcePolicy(input: SourcePolicyInput): SourcePolicyResult {
  const violations: SourcePolicyViolation[] = [];
  const reports: string[] = [];
  const servicePackages = new Set(input.servicePackages);
  const filePaths = new Set(input.files.map((file) => file.path));
  const featureRoots = new Set<string>();

  for (const file of input.files) {
    const root = appRoot(file.path);
    if (!root) continue;

    const feature = featureIdentity(file.path);
    if (feature) featureRoots.add(`${feature.app}/src/features/${feature.feature}`);

    if (/\.tsx$/.test(file.path) && !file.content.includes('HC-UI-001: approved')) {
      if (/<(?:button|input|select|textarea)(?:\s|\/?>)/.test(file.content)) {
        violations.push({
          rule: 'HC-UI-001',
          path: file.path,
          message: 'native interactive JSX must use Fluent UI React v9',
        });
      }
      if (
        file.content.includes("'@fluentui/react-components'") ||
        file.content.includes('"@fluentui/react-components"')
      ) {
        const manifestPath = `${root}/package.json`;
        const manifest = input.manifests[manifestPath];
        const dependencies = manifest
          ? (JSON.parse(manifest) as { dependencies?: Record<string, unknown> }).dependencies
          : undefined;
        if (!dependencies || !('@fluentui/react-components' in dependencies)) {
          violations.push({
            rule: 'HC-UI-001',
            path: manifestPath,
            message: 'Fluent UI React v9 must be a direct production dependency',
          });
        }
      }
    }

    for (const specifier of importSpecifiers(file.content)) {
      if (servicePackages.has(specifier) || specifier.includes('/services/')) {
        violations.push({
          rule: 'HC-ARCH-003',
          path: file.path,
          message: `browser source imports service implementation: ${specifier}`,
        });
      }

      if (!feature) continue;
      const target = featureImportTarget(file.path, specifier);
      if (!target || target.app !== feature.app || target.feature === feature.feature) continue;
      if (target.remainder !== '' && !/^\/index(?:\.[cm]?[jt]sx?|\.js)?$/.test(target.remainder)) {
        violations.push({
          rule: 'HC-ARCH-004',
          path: file.path,
          message: `private cross-feature import: ${specifier}`,
        });
      }
    }

    if (/\/src\/features\/.+\.[cm]?[jt]sx?$/.test(file.path)) {
      const lineCount = file.content.split('\n').length;
      if (lineCount > 300)
        reports.push(`SC-ARCH-001 ${file.path} is over 300 lines (${lineCount})`);
    }
  }

  for (const featureRoot of featureRoots) {
    if (!filePaths.has(`${featureRoot}/index.ts`)) {
      reports.push(`SC-ARCH-001 ${featureRoot} is missing public index.ts`);
    }
  }

  return { violations, reports };
}
