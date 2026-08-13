import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const promptDirectory = resolve(root, '.github/prompts');

function frontmatterName(content: string): string | null {
  const match = content.match(/---[\s\S]*?\nname:\s*([a-z0-9-]+)[\s\S]*?---/i);
  return match?.[1] ?? null;
}

describe('workflow prompt discovery', () => {
  it('contains all required slash workflow prompts', () => {
    const expected = [
      'eval-claude-md.prompt.md',
      'constitute.prompt.md',
      'reflect.prompt.md',
      'audit.prompt.md',
      'verify.prompt.md',
      'review-pr.prompt.md',
    ];

    for (const file of expected) {
      expect(existsSync(resolve(promptDirectory, file)), `missing prompt ${file}`).toBe(true);
    }
  });

  it('declares frontmatter name for each prompt', () => {
    const expectedNames = [
      'eval-claude-md',
      'constitute',
      'reflect',
      'audit',
      'verify',
      'review-pr',
    ];

    for (const name of expectedNames) {
      const file = resolve(promptDirectory, `${name}.prompt.md`);
      const content = readFileSync(file, 'utf8');
      expect(frontmatterName(content)).toBe(name);
    }
  });
});
