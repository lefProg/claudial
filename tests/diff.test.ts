import { describe, it, expect } from 'vitest';
import { diffGoals, diffIncidents } from '../src/engine/diff.js';
import type { Match, MatchIncident } from '../src/types.js';

function match(over: Partial<Match>): Match {
  return {
    id: 1, group: 'Group A',
    home: { name: 'Argentina', code: 'ARG' }, away: { name: 'Mexico', code: 'MEX' },
    homeScore: 0, awayScore: 0,
    status: 'live', statusText: '1st half', minute: 10, startTimestamp: 1_781_000_000,
    varInProgress: false,
    ...over,
  };
}

function incident(over: Partial<MatchIncident>): MatchIncident {
  return {
    id: 'a', kind: 'yellowCard', minute: 30, player: 'A B', playerShort: 'A. B',
    detail: null, isHome: true, homeScore: null, awayScore: null,
    ...over,
  };
}

describe('diffGoals', () => {
  it('emits a home goal on home score increase', () => {
    const out = diffGoals([match({})], [match({ homeScore: 1 })]);
    expect(out).toEqual([{ matchId: 1, side: 'home', homeScore: 1, awayScore: 0 }]);
  });

  it('emits an away goal on away score increase', () => {
    const out = diffGoals([match({})], [match({ awayScore: 1 })]);
    expect(out).toEqual([{ matchId: 1, side: 'away', homeScore: 0, awayScore: 1 }]);
  });

  it('emits two events when both sides scored between polls', () => {
    expect(diffGoals([match({})], [match({ homeScore: 1, awayScore: 1 })])).toHaveLength(2);
  });

  it('emits nothing for a match not in the previous snapshot (startup, no replays)', () => {
    expect(diffGoals([], [match({ homeScore: 2 })])).toEqual([]);
  });

  it('emits nothing when VAR decreases the score', () => {
    expect(diffGoals([match({ homeScore: 1 })], [match({ homeScore: 0 })])).toEqual([]);
  });

  it('emits nothing when scores are null', () => {
    expect(diffGoals([match({ homeScore: null })], [match({ homeScore: 1 })])).toEqual([]);
  });

  it('does not emit spurious events when prev contains duplicate ids', () => {
    const out = diffGoals(
      [match({ homeScore: 2 }), match({ homeScore: 1 })],
      [match({ homeScore: 2 })],
    );
    expect(out).toEqual([]);
  });

  it('tags both events with the same matchId when both sides scored', () => {
    const out = diffGoals([match({})], [match({ homeScore: 1, awayScore: 1 })]);
    expect(out.map((c) => c.matchId)).toEqual([1, 1]);
  });
});

describe('diffIncidents', () => {
  it('returns only incidents whose id was not seen before', () => {
    const seen = new Set(['a']);
    const out = diffIncidents(seen, [incident({ id: 'a' }), incident({ id: 'b', kind: 'redCard' })]);
    expect(out.map((i) => i.id)).toEqual(['b']);
  });

  it('mutates the seen set so the same incident never fires twice', () => {
    const seen = new Set<string>();
    diffIncidents(seen, [incident({ id: 'a' })]);
    expect(diffIncidents(seen, [incident({ id: 'a' })])).toEqual([]);
  });

  it('handles an empty incident list without touching the seen set', () => {
    const seen = new Set<string>(['x']);
    expect(diffIncidents(seen, [])).toEqual([]);
    expect(seen).toEqual(new Set(['x']));
  });
});
