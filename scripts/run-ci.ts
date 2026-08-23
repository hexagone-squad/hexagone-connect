import { spawnSync } from 'node:child_process';

const stages = [
  'format:check',
  'lint',
  'typecheck',
  'check:typesafety',
  'check:source-policy',
  'check:ownership',
  'build',
  'test:unit',
  'test:contracts',
  'check:contracts',
  'test:architecture',
  'test:integration',
  'test:e2e',
  'test:a11y',
  'check:test-mapping',
  'check:secrets',
  'check:sdl-source',
  'check:licenses',
  'check:docs',
  'check:localization',
  'check:governance',
  'check:budgets',
  'test:ai',
];

for (const stage of stages) {
  console.log(`\n=== ${stage} ===`);
  const result = spawnSync('pnpm', ['run', stage], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('\nPASS validate complete deterministic gate');
