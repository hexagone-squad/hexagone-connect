import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Abdou platform POC contract', () => {
  it('hardens the work-management image and defines meaningful readiness', () => {
    const dockerfile = readFileSync('services/work-management/Dockerfile', 'utf8');
    expect(dockerfile).toContain('USER node');
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('/health/ready');
    expect(dockerfile).not.toContain('CMD ["node", "--version"]');
  });
  it('provides reproducible synthetic backup and restore automation', () => {
    expect(existsSync('database/poc/synthetic-recovery.sh')).toBe(true);
    const drill = readFileSync('database/poc/synthetic-recovery.sh', 'utf8');
    expect(drill).toContain('pg_dump');
    expect(drill).toContain('pg_restore');
    expect(drill).toContain('synthetic');
    expect(drill).toContain('checksum');
  });
  it('adds image scan and SBOM evidence without replacing SDL checks', () => {
    const workflow = readFileSync('.github/workflows/container-poc-security.yml', 'utf8');
    const existing = readFileSync('.github/workflows/pull-request.yml', 'utf8');
    expect(workflow).toContain('container-poc-security');
    expect(workflow).toContain('anchore/sbom-action');
    expect(workflow).toContain('aquasecurity/trivy-action');
    expect(existing).toContain('pnpm run check:sdl-source');
  });
});
