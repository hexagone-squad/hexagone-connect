import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function runRecoveryDrill(collisionCount: '0' | '1') {
  const tempRoot = mkdtempSync(resolve(tmpdir(), 'synthetic-recovery-test-'));
  const binDirectory = resolve(tempRoot, 'bin');
  const dockerLog = resolve(tempRoot, 'docker.log');
  const fakeDocker = resolve(binDirectory, 'docker');

  mkdirSync(binDirectory, { recursive: true });
  writeFileSync(
    fakeDocker,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$FAKE_DOCKER_LOG"
command_line="$*"
if [[ "$command_line" == *"from pg_database"* ]]; then
  printf '%s\\n' "\${FAKE_COLLISION_COUNT:-0}"
elif [[ "$command_line" == *"md5(string_agg"* ]]; then
  printf '%s\\n' '3:test-checksum'
fi
`,
  );
  chmodSync(fakeDocker, 0o755);

  const result = spawnSync('bash', ['database/poc/synthetic-recovery.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ''}`,
      FAKE_DOCKER_LOG: dockerLog,
      FAKE_COLLISION_COUNT: collisionCount,
      RECOVERY_RUN_ID: 'test_run',
    },
  });
  const log = existsSync(dockerLog) ? readFileSync(dockerLog, 'utf8') : '';

  rmSync(tempRoot, { recursive: true, force: true });
  return { ...result, log };
}

describe('Abdou platform POC contract', () => {
  it('hardens the work-management image and defines meaningful readiness', () => {
    const dockerfile = readFileSync('services/work-management/Dockerfile', 'utf8');
    const server = readFileSync('services/work-management/container/server.mjs', 'utf8');
    expect(server).toContain("Number(process.env.PORT ?? '3000')");
    expect(dockerfile).toMatch(/^FROM node:22.23.2-alpine3.23@sha256:[a-f0-9]{64}$/m);
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

  it('refuses database-name collisions without modifying existing resources', () => {
    const result = runRecoveryDrill('1');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('collision');
    expect(result.log).not.toContain('createdb');
    expect(result.log).not.toContain('drop database');
  });

  it('cleans up only the uniquely named databases created by the current run', () => {
    const result = runRecoveryDrill('0');

    expect(result.status).toBe(0);
    expect(result.log).toContain('hexagone_poc_source_test_run');
    expect(result.log).toContain('hexagone_poc_restore_test_run');
    expect(result.log).toContain('drop database');
    expect(result.log).not.toContain('hexagone_restore_poc');
    expect(result.log).not.toContain('drop table');
  });

  it('adds image scan and SBOM evidence without replacing SDL checks', () => {
    const workflow = readFileSync('.github/workflows/container-poc-security.yml', 'utf8');
    const existing = readFileSync('.github/workflows/pull-request.yml', 'utf8');
    expect(workflow).toContain('container-poc-security');
    expect(workflow).toContain('anchore/sbom-action');
    expect(workflow).toContain('aquasecurity/trivy-action');
    expect(workflow).toContain('workflow_call');
    expect(workflow).not.toContain('ignore-unfixed');
    expect(existing).toContain('uses: ./.github/workflows/container-poc-security.yml');
    expect(existing).toContain('- container-poc-security');
    expect(existing).toContain('pnpm run check:sdl-source');
  });
});
