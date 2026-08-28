import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function check(report: unknown) {
  return spawnSync('pnpm', ['exec', 'tsx', 'scripts/check-licenses.ts'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: JSON.stringify(report),
  });
}

describe('production license policy', () => {
  it('accepts pnpm 10 grouped entries with a singular license field', () => {
    const result = check({
      MIT: [
        { name: 'react', version: '19.2.8', license: 'MIT' },
        { name: 'react-dom', version: '19.2.8', license: 'MIT' },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('2 production dependency entries allowed');
  });

  it('continues to accept flat entries with plural licenses', () => {
    const result = check([{ name: 'example', licenses: ['MIT', 'ISC'] }]);

    expect(result.status).toBe(0);
  });

  it('rejects an entry outside the allowlist', () => {
    const result = check({ proprietary: [{ name: 'blocked', license: 'Proprietary' }] });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('BLOCKED HC-DEP-001');
  });
});
