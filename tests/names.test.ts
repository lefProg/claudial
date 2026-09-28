import { describe, it, expect } from 'vitest';
import { homeName, awayName } from '../src/ui/flags.js';
import { scorers } from '../src/ui/MatchRow.js';

describe('full team names', () => {
  it('shows clubs by name, without flags', () => {
    expect(homeName({ name: 'Arsenal', code: 'ARS', national: false })).toBe('Arsenal');
    expect(awayName({ name: 'Panetolikos', code: 'PAN', national: false })).toBe('Panetolikos');
  });
  it('keeps flags beside national team names', () => {
    expect(homeName({ name: 'Qatar', code: 'QAT', national: true })).toBe('Qatar 🇶🇦');
    expect(awayName({ name: 'Switzerland', code: 'SUI' })).toBe('🇨🇭 Switzerland');
  });
});

describe('scorers', () => {
  const g = (minute: number, who: string) => ({ id: `${minute}`, kind: 'goal' as const, minute, player: who, playerShort: who, detail: null, isHome: true, homeScore: null, awayScore: null });
  it('groups goals by scorer in order of their first goal', () => {
    expect(scorers([g(43, 'C. Gakpo'), g(47, 'D. Núñez'), g(50, 'C. Gakpo'), g(88, 'R. Firmino')]))
      .toBe("43' 50' C. Gakpo · 47' D. Núñez · 88' R. Firmino");
  });
});
