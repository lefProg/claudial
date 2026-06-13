import { describe, it, expect } from 'vitest';
import { liveLine, scoreLine } from '../src/statusline/line.js';
import type { Match } from '../src/types.js';

function m(over: Partial<Match>): Match {
  return {
    id: 1, group: null,
    home: { name: 'Qatar', code: 'QAT' }, away: { name: 'Switzerland', code: 'SUI' },
    homeScore: 0, awayScore: 1, status: 'live', statusText: '2nd half',
    minute: 67, startTimestamp: 1_781_000_000, varInProgress: false,
    ...over,
  };
}

describe('liveLine', () => {
  it('renders code, em-dash score and minute', () => {
    expect(liveLine(m({}))).toBe("⚽ QAT 0—1 SUI 67'");
  });
  it('renders HT at halftime with no minute', () => {
    expect(liveLine(m({ status: 'halftime', minute: null }))).toBe('⚽ QAT 0—1 SUI HT');
  });
  it('treats null scores as 0', () => {
    expect(liveLine(m({ homeScore: null, awayScore: null }))).toBe("⚽ QAT 0—0 SUI 67'");
  });
});

describe('scoreLine', () => {
  const now = Date.UTC(2026, 5, 13, 0, 0, 0);
  it('joins multiple live matches with two spaces', () => {
    const a = m({ id: 1 });
    const b = m({ id: 2, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Spain', code: 'ESP' }, homeScore: 2, awayScore: 2, minute: 30 });
    expect(scoreLine([a, b], [], now)).toBe("⚽ QAT 0—1 SUI 67'  ⚽ BRA 2—2 ESP 30'");
  });
  it('falls back to next kickoff when nothing live', () => {
    const up = m({ status: 'upcoming', homeScore: null, awayScore: null, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Morocco', code: 'MOR' }, startTimestamp: Math.floor(Date.UTC(2026, 5, 15, 18, 0, 0) / 1000) });
    expect(scoreLine([], [up], now)).toMatch(/^○ BRA—MOR /);
  });
  it('returns empty string when nothing live or upcoming', () => {
    expect(scoreLine([], [], now)).toBe('');
  });
});
