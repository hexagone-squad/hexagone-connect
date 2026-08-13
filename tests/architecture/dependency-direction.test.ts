import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('architecture dependency direction', () => {
  it('enforces the repository boundary policy', () => {
    const output = execFileSync('pnpm', ['run', 'check:architecture'], {
      encoding: 'utf8',
    });

    expect(output).toContain('PASS architecture boundaries');
  });
});
