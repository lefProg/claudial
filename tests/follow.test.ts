import { describe, it, expect } from 'vitest';
import { applyTargets, matchesSearch } from '../src/cli/follow.js';
import { homeTag, awayTag } from '../src/ui/flags.js';

const leagues = [{ slug: 'eng.1', name: 'Premier League' }, { slug: 'gre.1', name: 'Super League Greece' }];

describe('applyTargets', () => {
  it('treats slugs as leagues and digits as team ids, without duplicates', () => {
    const s = applyTargets({ leagues: ['eng.1'], teams: [] }, ['gre.1', '443', 'eng.1', '443'], true, leagues);
    expect(s).toEqual({ leagues: ['eng.1', 'gre.1'], teams: ['443'] });
    expect(applyTargets(s, ['eng.1', '443'], false, leagues)).toEqual({ leagues: ['gre.1'], teams: [] });
  });

  it('rejects a target that is neither, naming where to look', () => {
    expect(() => applyTargets({ leagues: [], teams: [] }, ['PAO'], true, leagues)).toThrow(/claudial teams/);
  });
});

describe('matchesSearch', () => {
  const pao = { id: '443', name: 'Panathinaikos', code: 'PAO' };
  it('matches name or code, ignoring case and accents', () => {
    expect(matchesSearch(pao, 'pana')).toBe(true);
    expect(matchesSearch(pao, 'PAO')).toBe(true);
    expect(matchesSearch({ id: '1', name: 'Atlético Madrid', code: 'ATM' }, 'atletico')).toBe(true);
    expect(matchesSearch(pao, 'olympiacos')).toBe(false);
  });
});

describe('club flags', () => {
  it('never gives a club the flag of a country with the same code', () => {
    expect(homeTag('PAN', false)).toBe('PAN');
    expect(awayTag('PAR', false)).toBe('PAR');
    expect(homeTag('PAN')).not.toBe('PAN'); // Panama, national team
  });
});
