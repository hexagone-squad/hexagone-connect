import { describe, expect, it } from 'vitest';
import { evaluateSourcePolicy, type SourcePolicyInput } from '../../scripts/source-policy.js';

function evaluate(overrides: Partial<SourcePolicyInput> = {}) {
  return evaluateSourcePolicy({
    files: [],
    manifests: {},
    servicePackages: ['@hexagone/work-management'],
    ...overrides,
  });
}

describe('source policy', () => {
  it('rejects native interactive React controls and accepts Fluent controls', () => {
    const native = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/example/example-page.tsx',
          content: 'export const ExamplePage = () => <button>Save</button>;',
        },
      ],
      manifests: {
        'apps/admin-portal/package.json': JSON.stringify({
          dependencies: { '@fluentui/react-components': '^9.0.0' },
        }),
      },
    });
    expect(native.violations).toContainEqual(
      expect.objectContaining({ rule: 'HC-UI-001', path: expect.stringContaining('example-page') }),
    );

    const fluent = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/example/example-page.tsx',
          content:
            "import { Button } from '@fluentui/react-components'; export const ExamplePage = () => <Button>Save</Button>;",
        },
      ],
      manifests: {
        'apps/admin-portal/package.json': JSON.stringify({
          dependencies: { '@fluentui/react-components': '^9.0.0' },
        }),
      },
    });
    expect(fluent.violations).toEqual([]);
  });

  it('rejects browser imports from service packages', () => {
    const result = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/example/example-adapter.ts',
          content: "import { buildWorkManagement } from '@hexagone/work-management';",
        },
      ],
    });

    expect(result.violations).toContainEqual(expect.objectContaining({ rule: 'HC-ARCH-003' }));
  });

  it('requires cross-feature imports to use the target public index', () => {
    const privateImport = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/alpha/alpha-page.tsx',
          content: "import { BetaPanel } from '../beta/beta-panel.js';",
        },
        { path: 'apps/admin-portal/src/features/alpha/index.ts', content: '' },
        { path: 'apps/admin-portal/src/features/beta/index.ts', content: '' },
      ],
    });
    expect(privateImport.violations).toContainEqual(
      expect.objectContaining({ rule: 'HC-ARCH-004' }),
    );

    const publicImport = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/alpha/alpha-page.tsx',
          content: "import { BetaPanel } from '../beta/index.js';",
        },
        { path: 'apps/admin-portal/src/features/alpha/index.ts', content: '' },
        { path: 'apps/admin-portal/src/features/beta/index.ts', content: '' },
      ],
    });
    expect(publicImport.violations).toEqual([]);
  });

  it('reports oversized modules and feature folders without a public index', () => {
    const result = evaluate({
      files: [
        {
          path: 'apps/admin-portal/src/features/large/large-page.tsx',
          content: Array.from(
            { length: 301 },
            (_, index) => `export const line${index} = ${index};`,
          ).join('\n'),
        },
      ],
    });

    expect(result.reports).toEqual(
      expect.arrayContaining([
        expect.stringContaining('over 300 lines'),
        expect.stringContaining('missing public index.ts'),
      ]),
    );
  });
});
