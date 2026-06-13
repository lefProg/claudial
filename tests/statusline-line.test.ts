import { describe, it, expect } from 'vitest';
import { liveLine, finishedLine, scoreLine } from '../src/statusline/line.js';
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

const HOUR = 3600;
const now = Date.UTC(2026, 5, 13, 18, 0, 0);
const nowS = Math.floor(now / 1000);

describe('liveLine', () => {
  it('renders mirrored code+flag, em-dash score and minute', () => {
    expect(liveLine(m({}))).toBe("⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67'");
  });
  it('renders HT at halftime', () => {
    expect(liveLine(m({ status: 'halftime', minute: null }))).toBe('⚽ QAT 🇶🇦 0—1 🇨🇭 SUI HT');
  });
});

describe('finishedLine', () => {
  it('renders the result with FT', () => {
    expect(finishedLine(m({ status: 'finished', minute: null, homeScore: 2, awayScore: 1 })))
      .toBe('⚽ QAT 🇶🇦 2—1 🇨🇭 SUI FT');
  });
});

describe('scoreLine', () => {
  it('joins live matches when any are live', () => {
    const a = m({ id: 1 });
    const b = m({ id: 2, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Spain', code: 'ESP' }, homeScore: 2, awayScore: 2, minute: 30 });
    expect(scoreLine([a, b], [], [], now)).toBe("⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67'  ⚽ BRA 🇧🇷 2—2 🇪🇸 ESP 30'");
  });

  it('shows the finished result when now is closer to its end than to next kickoff', () => {
    const fin = m({ id: 1, status: 'finished', minute: null, homeScore: 2, awayScore: 1, startTimestamp: nowS - (2 * HOUR - 5 * 60) });
    const next = m({ id: 2, status: 'upcoming', homeScore: null, awayScore: null, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Morocco', code: 'MAR' }, startTimestamp: nowS + 3 * HOUR });
    expect(scoreLine([], [fin], [next], now)).toBe('⚽ QAT 🇶🇦 2—1 🇨🇭 SUI FT');
  });

  it('shows the next kickoff when now is closer to it than to the last finish', () => {
    const fin = m({ id: 1, status: 'finished', minute: null, homeScore: 2, awayScore: 1, startTimestamp: nowS - 6 * HOUR });
    const next = m({ id: 2, status: 'upcoming', homeScore: null, awayScore: null, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Morocco', code: 'MAR' }, startTimestamp: nowS + 30 * 60 });
    expect(scoreLine([], [fin], [next], now)).toMatch(/^○ BRA 🇧🇷 — 🇲🇦 MAR /);
  });

  it('picks the latest finished by kickoff', () => {
    const older = m({ id: 1, status: 'finished', minute: null, homeScore: 0, awayScore: 0, startTimestamp: nowS - 5 * HOUR });
    const newer = m({ id: 2, status: 'finished', minute: null, homeScore: 3, awayScore: 0, home: { name: 'Brazil', code: 'BRA' }, away: { name: 'Spain', code: 'ESP' }, startTimestamp: nowS - 2 * HOUR });
    expect(scoreLine([], [older, newer], [], now)).toBe('⚽ BRA 🇧🇷 3—0 🇪🇸 ESP FT');
  });

  it('handles only-finished, only-next, and neither', () => {
    const fin = m({ id: 1, status: 'finished', minute: null, homeScore: 1, awayScore: 0, startTimestamp: nowS - 3 * HOUR });
    expect(scoreLine([], [fin], [], now)).toBe('⚽ QAT 🇶🇦 1—0 🇨🇭 SUI FT');
    const next = m({ id: 2, status: 'upcoming', homeScore: null, awayScore: null, startTimestamp: nowS + HOUR });
    expect(scoreLine([], [], [next], now)).toMatch(/^○ QAT 🇶🇦 — 🇨🇭 SUI /);
    expect(scoreLine([], [], [], now)).toBe('');
  });
});
