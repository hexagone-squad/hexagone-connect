import { describe, expect, it } from 'vitest';
import { parseCodeowners, validateCodeownersEntries } from '../../scripts/check-ownership.js';

describe('CODEOWNERS validation', () => {
  it('accepts valid CODEOWNERS entries with catch-all ownership', () => {
    const entries = parseCodeowners('* @org/eng\n/scripts/ @org/eng\n');
    expect(() =>
      validateCodeownersEntries(
        entries,
        (path) => path === 'scripts' || path === '.github/CODEOWNERS',
      ),
    ).not.toThrow();
  });

  it('rejects invalid owner syntax', () => {
    expect(() => parseCodeowners('* org/eng\n')).toThrow("must start with '@'");
  });

  it('rejects missing catch-all rule', () => {
    const entries = parseCodeowners('/scripts/ @org/eng\n');
    expect(() => validateCodeownersEntries(entries, () => true)).toThrow('missing catch-all');
  });

  it('rejects rules that reference missing paths', () => {
    const entries = parseCodeowners('* @org/eng\n/docs/methodology/ @org/arch\n');
    expect(() => validateCodeownersEntries(entries, (path) => path !== 'docs/methodology')).toThrow(
      'does not exist',
    );
  });
});
