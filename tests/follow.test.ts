import { describe, it, expect } from 'vitest';
import { applyTargets, matchesSearch, describeError } from '../src/cli/follow.js';
import { ApiError } from '../src/api/backend.js';
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

describe('describeError', () => {
  it('turns network failures into a plain message', () => {
    expect(describeError(new TypeError('fetch failed'))).toMatch(/^can't reach the claudial server/);
    const timeout = new Error('timed out'); timeout.name = 'TimeoutError';
    expect(describeError(timeout)).toMatch(/^can't reach the claudial server/);
  });
  it("keeps the server's own message and other errors as they are", () => {
    expect(describeError(new ApiError(400, 'unknown league'))).toBe('server said: unknown league');
    expect(describeError(new Error('"x" is neither a league slug'))).toBe('"x" is neither a league slug');
  });
});
