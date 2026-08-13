import { describe, expect, it } from 'vitest';
import { scanSdlRisks } from '../../scripts/check-sdl-source.js';

describe('SDL source analysis', () => {
  it('finds risky runtime code execution patterns', () => {
    const findings = scanSdlRisks([
      {
        path: 'services/example/src/risky.ts',
        content: 'const result = eval(userInput);\nconst proc = exec(cmd);\n',
      },
    ]);

    expect(findings.map((item) => item.rule)).toEqual(['SDL-001', 'SDL-004']);
  });

  it('skips explicitly documented risk exceptions', () => {
    const findings = scanSdlRisks([
      {
        path: 'services/example/src/exception.ts',
        content: '// SDL-ALLOW validated static script\nconst command = exec(script);\n',
      },
    ]);

    expect(findings).toEqual([]);
  });

  it('does not flag safe process execution defaults', () => {
    const findings = scanSdlRisks([
      {
        path: 'scripts/safe.ts',
        content: "spawnSync('git', ['status']);\n",
      },
    ]);

    expect(findings).toEqual([]);
  });
});
