import { describe, it, expect } from 'vitest';
import { isShareIdValid } from './util';

describe('isShareIdValid', () => {
  it('rejects empty string', () => {
    expect(isShareIdValid('')).toBe(false);
  });

  it('rejects too short (< 8 chars)', () => {
    expect(isShareIdValid('abc123')).toBe(false);
  });

  it('rejects illegal characters', () => {
    expect(isShareIdValid('abc 123 xyz')).toBe(false);
    expect(isShareIdValid('abc/def')).toBe(false);
  });

  it('accepts valid alphanumeric + dash + underscore', () => {
    expect(isShareIdValid('abc12345')).toBe(true);
    expect(isShareIdValid('demo_1234')).toBe(true);
    expect(isShareIdValid('demo-1234')).toBe(true);
  });

  it('rejects too long (> 64 chars)', () => {
    expect(isShareIdValid('a'.repeat(65))).toBe(false);
  });
});
