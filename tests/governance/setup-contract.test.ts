import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function filesIn(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const entries: string[] = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) entries.push(...filesIn(path));
    else entries.push(path);
  }
  return entries;
}

describe('early-stage setup contract', () => {
  it('exposes one clear command path for setup and validation', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      packageManager?: string;
      scripts?: Record<string, string>;
    };

    expect(manifest.packageManager).toMatch(/^pnpm@10\./);
    expect(manifest.scripts?.dev).toBe('vitest --watch');
    expect(manifest.scripts?.build).toBe('pnpm -r --if-present run build');
    expect(manifest.scripts?.['test:unit']).toContain('vitest run');
    expect(manifest.scripts?.validate).toBe('tsx scripts/run-ci.ts');
    expect(manifest.scripts?.['build:ci']).toBe(
      'pnpm run validate && pnpm run check:dependency-vulnerabilities',
    );
  });

  it('keeps CI diagnostics split between deterministic validation and network audit', () => {
    const workflow = readFileSync('.github/workflows/pull-request.yml', 'utf8');

    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('build-lint-type-unit');
    expect(workflow).toContain('security-sdl');
    expect(workflow).toContain('pr-validation-gate');
    expect(workflow).toContain('pnpm run check:sdl-source');
    expect(workflow).toContain('pnpm run check:dependency-vulnerabilities');
  });

  it('keeps public API contracts in the canonical contracts tree', () => {
    const serviceLocalContracts = filesIn('services').filter((file) =>
      /\/openapi\.ya?ml$/.test(file),
    );

    expect(serviceLocalContracts).toEqual([]);
    expect(existsSync('contracts/openapi/work-management.v1.yaml')).toBe(true);
  });

  it('does not keep unused setup scaffolding active', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8');

    expect(compose).toContain('postgres:');
    expect(compose).not.toContain('jaeger');
    expect(existsSync('services/service-template')).toBe(false);
    expect(existsSync('.agents')).toBe(false);
    expect(existsSync('.codex')).toBe(false);
  });
});
