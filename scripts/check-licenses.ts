import { readFileSync } from 'node:fs';

const policy = JSON.parse(readFileSync('policies/license-allowlist.json', 'utf8')) as {
  allowed: unknown;
};
if (!Array.isArray(policy.allowed) || !policy.allowed.every((entry) => typeof entry === 'string')) {
  throw new Error('BLOCKED HC-DEP-001 invalid license allowlist policy');
}
const allowed = new Set(policy.allowed as string[]);

const rawReport = readFileSync(0, 'utf8').trim();
if (rawReport === 'No licenses in packages found') {
  console.log('PASS license policy: no production dependency entries found');
  process.exit(0);
}
const report = JSON.parse(rawReport) as unknown;
const entries = Array.isArray(report) ? report : Object.values(report as Record<string, unknown>);
for (const entry of entries) {
  const licenses =
    typeof entry === 'object' && entry !== null
      ? (entry as { licenses?: unknown }).licenses
      : undefined;
  const values = Array.isArray(licenses)
    ? licenses
    : typeof licenses === 'string'
      ? [licenses]
      : [];
  if (values.length === 0 || !values.every((license) => allowed.has(license))) {
    throw new Error(`BLOCKED HC-DEP-001 disallowed or unknown license: ${JSON.stringify(entry)}`);
  }
}
console.log(`PASS license policy: ${entries.length} production dependency entries allowed`);
