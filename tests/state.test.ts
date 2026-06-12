import { describe, it, expect } from 'vitest';
import { reducer, initialState, type AppState } from '../src/state.js';
import type { Match, Takeover } from '../src/types.js';

const m: Match = {
  id: 1, group: 'Group A',
  home: { name: 'Argentina', code: 'ARG' }, away: { name: 'Mexico', code: 'MEX' },
  homeScore: 1, awayScore: 0, status: 'live', statusText: '1st half',
  minute: 23, startTimestamp: 1_781_000_000, varInProgress: false,
};
const takeover: Takeover = {
  kind: 'goal', match: m, who: 'Lionel Messi', detail: null,
  minute: 23, homeScore: 1, awayScore: 0,
};

describe('reducer', () => {
  it('stores live matches and clears stale flag', () => {
    const stale: AppState = { ...initialState, stale: true };
    const s = reducer(stale, { type: 'live', matches: [m], at: 123 });
    expect(s.live).toEqual([m]);
    expect(s.stale).toBe(false);
    expect(s.lastUpdated).toBe(123);
  });

  it('stores fixtures', () => {
    const s = reducer(initialState, { type: 'fixtures', upcoming: [m], recent: [] });
    expect(s.upcoming).toEqual([m]);
  });

  it('queues takeovers in order', () => {
    let s = reducer(initialState, { type: 'takeover', takeover });
    s = reducer(s, { type: 'takeover', takeover: { ...takeover, kind: 'redcard', who: 'C D' } });
    expect(s.takeovers).toHaveLength(2);
    expect(s.takeovers[0].who).toBe('Lionel Messi');
  });

  it('takeoverDone advances the queue', () => {
    let s = reducer(initialState, { type: 'takeover', takeover });
    s = reducer(s, { type: 'takeoverDone' });
    expect(s.takeovers).toHaveLength(0);
  });

  it('stores incident lists per match', () => {
    const s = reducer(initialState, {
      type: 'incidents', matchId: 1,
      incidents: [{ id: 'x', kind: 'goal', minute: 21, player: 'Jovo Lukić', playerShort: 'J. Lukić', detail: null, isHome: false, homeScore: 0, awayScore: 1 }],
    });
    expect(s.incidents[1]).toHaveLength(1);
  });

  it('stale marks data as stale but keeps it', () => {
    let s = reducer(initialState, { type: 'live', matches: [m], at: 1 });
    s = reducer(s, { type: 'stale' });
    expect(s.stale).toBe(true);
    expect(s.live).toEqual([m]);
  });

  it('takeoverDone on an empty queue is a safe no-op', () => {
    const s = reducer(initialState, { type: 'takeoverDone' });
    expect(s.takeovers).toEqual([]);
  });

  it('incidents for a second match do not clobber the first', () => {
    const inc = (id: string) => [{ id, kind: 'goal' as const, minute: 1, player: 'P', playerShort: 'P.', detail: null, isHome: true, homeScore: 1, awayScore: 0 }];
    let s = reducer(initialState, { type: 'incidents', matchId: 1, incidents: inc('a') });
    s = reducer(s, { type: 'incidents', matchId: 2, incidents: inc('b') });
    expect(s.incidents[1]![0]!.id).toBe('a');
    expect(s.incidents[2]![0]!.id).toBe('b');
  });
});
