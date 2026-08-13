import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const canonicalDocs = [
  'README.md',
  'docs/README.md',
  'docs/architecture/README.md',
  'docs/codebase-map.md',
  'docs/development.md',
  'docs/governance.md',
  'docs/troubleshooting.md',
  'docs/glossary.md',
  'docs/adr/template.md',
];

const removedDuplicateDocs = [
  'DEVELOPMENT.md',
  'GOVERNANCE.md',
  'docs/guides/developer-guide.md',
  'docs/operations/runbook.md',
  'docs/operations/tsg.md',
  'docs/constitution/repository-governance.md',
  'docs/constitution/operations-governance.md',
  'docs/constitution/service-definition-of-done.md',
];

describe('documentation system', () => {
  it('keeps one canonical onboarding document per topic', () => {
    for (const path of canonicalDocs) expect(existsSync(path), path).toBe(true);
    for (const path of removedDuplicateDocs) expect(existsSync(path), path).toBe(false);
  });

  it('links README navigation to the canonical docs', () => {
    const readme = readFileSync('README.md', 'utf8');

    expect(readme).toContain('(docs/architecture/README.md)');
    expect(readme).toContain('(docs/codebase-map.md)');
    expect(readme).toContain('(docs/development.md)');
    expect(readme).toContain('(docs/governance.md)');
    expect(readme).toContain('(docs/troubleshooting.md)');
    expect(readme).toContain('(docs/glossary.md)');
  });

  it('keeps the architecture overview grounded in implemented code paths', () => {
    const architecture = readFileSync('docs/architecture/README.md', 'utf8');

    for (const path of [
      'services/work-management/src/composition-root.ts',
      'services/identity-tenant/src/authorization.ts',
      'services/ai-orchestration/src/inspection-assistant.ts',
      'contracts/openapi/work-management.v1.yaml',
      'contracts/events/work-request-created.v1.schema.json',
    ]) {
      expect(existsSync(path), path).toBe(true);
      expect(architecture).toContain(path);
    }
    expect(architecture).toContain('```mermaid');
  });
});
