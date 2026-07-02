import { describe, it, expect } from 'vitest';

/**
 * Hint prompt quality checks.
 * Ensures the hint system prompt has:
 *  - plain-language constraint
 *  - guiding-first structure (先问再答)
 *  - technical term glossing (推挽 etc.)
 *  - encouraging tone
 *  - minimum length
 */

// Required keywords — if these appear in the prompt, the quality bars are met
const HINT_REQUIRED_KEYWORDS = [
  '白话',
  '先问',
  '再答',
  '推挽',
  '阳极',
  '阴极',
  '不是直接报答案', // replaces old "别急"
];

describe('SYSTEM_PROMPTS.hint quality checks', () => {
  // We import the actual prompt from the compiled route file so the test
  // reflects real code, not a hard-coded string.
  it('hint prompt contains all required quality keywords', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    const hint = prompts.hint;
    expect(typeof hint).toBe('string');
    for (const kw of HINT_REQUIRED_KEYWORDS) {
      expect(hint, `hint prompt should mention "${kw}"`).toContain(kw);
    }
  });

  it('hint prompt is longer than explain/error (more guidance = longer)', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    const { explain, error, hint } = prompts;
    // H1 example was ~280 tokens; optimized hint should be ≥ 400 chars
    expect(hint.length).toBeGreaterThan(400);
    expect(hint.length).toBeGreaterThan(explain.length);
    expect(hint.length).toBeGreaterThan(error.length);
  });

  it('explain and error prompts are present and non-empty', async () => {
    const mod = await import('./ai-routes.js');
    const prompts = mod.SYSTEM_PROMPTS as { [key: string]: string };
    expect(prompts.explain.length).toBeGreaterThan(50);
    expect(prompts.error.length).toBeGreaterThan(50);
    expect(prompts.hint.length).toBeGreaterThan(50);
  });
});
