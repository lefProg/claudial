import { describe, it, expect } from 'vitest';
import { flagFor, homeTag, awayTag } from '../src/ui/flags.js';

describe('flagFor', () => {
  it('maps normal countries to regional-indicator flags', () => {
    expect(flagFor('SUI')).toBe('🇨🇭');
    expect(flagFor('MAR')).toBe('🇲🇦');
    expect(flagFor('CIV')).toBe('🇨🇮');
    expect(flagFor('CUW')).toBe('🇨🇼');
    expect(flagFor('CPV')).toBe('🇨🇻');
    expect(flagFor('QAT')).toBe('🇶🇦');
    expect(flagFor('USA')).toBe('🇺🇸');
  });
  it('maps home nations to subdivision (tag-sequence) flags', () => {
    expect(flagFor('SCO')).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}');
    expect(flagFor('ENG')).toBe('\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
  });
  it('returns empty string for unknown codes and bracket placeholders', () => {
    expect(flagFor('1A')).toBe('');
    expect(flagFor('QFW1')).toBe('');
    expect(flagFor('ZZZ')).toBe('');
  });
});

describe('homeTag / awayTag', () => {
  it('mirrors the flag around the code (home trails, away leads)', () => {
    expect(homeTag('QAT')).toBe('QAT 🇶🇦');
    expect(awayTag('SUI')).toBe('🇨🇭 SUI');
  });
  it('falls back to just the code when unmapped', () => {
    expect(homeTag('1A')).toBe('1A');
    expect(awayTag('QFW1')).toBe('QFW1');
  });
});
