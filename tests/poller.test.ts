import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startPoller, type PollerDeps } from '../src/engine/poller.js';
import type { Match, MatchIncident } from '../src/types.js';
import type { Action } from '../src/state.js';

const base: Match = {
  id: 1, group: 'Group A',
  home: { name: 'Argentina', code: 'ARG' }, away: { name: 'Mexico', code: 'MEX' },
  homeScore: 0, awayScore: 0, status: 'live', statusText: '1st half',
  minute: 10, startTimestamp: 1_781_000_000, varInProgress: false,
};

const goalIncident: MatchIncident = {
  id: 'g1', kind: 'goal', minute: 23, player: 'Lionel Messi', playerShort: 'L. Messi',
  detail: null, isHome: true, homeScore: 1, awayScore: 0,
};
const redIncident: MatchIncident = {
  id: 'r1', kind: 'redCard', minute: 55, player: 'C D', playerShort: 'C. D',
  detail: null, isHome: false, homeScore: null, awayScore: null,
};

function makeDeps(liveSnapshots: Match[][], incidentSnapshots: MatchIncident[][]): { deps: PollerDeps; actions: Action[] } {
  const actions: Action[] = [];
  let liveCall = 0;
  let incCall = 0;
  return {
    actions,
    deps: {
      fetchLive: vi.fn(async () => liveSnapshots[Math.min(liveCall++, liveSnapshots.length - 1)]),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async () => incidentSnapshots[Math.min(incCall++, incidentSnapshots.length - 1)]),
      dispatch: (a: Action) => actions.push(a),
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('startPoller', () => {
  it('dispatches live + fixtures + incidents on start, with no takeovers (no replays)', async () => {
    const { deps, actions } = makeDeps([[{ ...base, awayScore: 1 }]], [[{ ...goalIncident, isHome: false }]]);
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(actions.some((a) => a.type === 'live')).toBe(true);
    expect(actions.some((a) => a.type === 'fixtures')).toBe(true);
    expect(actions.some((a) => a.type === 'incidents' && a.matchId === 1)).toBe(true);
    expect(actions.some((a) => a.type === 'takeover')).toBe(false);
    poller.stop();
  });

  it('emits a goal takeover with scorer when the score increases between ticks', async () => {
    const { deps, actions } = makeDeps(
      [[base], [{ ...base, homeScore: 1 }]],
      [[], [goalIncident]],
    );
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);      // tick 1: 0-0, no incidents
    await vi.advanceTimersByTimeAsync(15_000); // tick 2: 1-0, goal incident
    const t = actions.find((a) => a.type === 'takeover') as Extract<Action, { type: 'takeover' }>;
    expect(t).toBeDefined();
    expect(t.takeover.kind).toBe('goal');
    expect(t.takeover.who).toBe('Lionel Messi');
    poller.stop();
  });

  it('emits a redcard takeover from a new incident without any score change', async () => {
    const { deps, actions } = makeDeps(
      [[base], [base]],
      [[], [redIncident]],
    );
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    const t = actions.find((a) => a.type === 'takeover') as Extract<Action, { type: 'takeover' }>;
    expect(t.takeover.kind).toBe('redcard');
    expect(t.takeover.who).toBe('C D');
    poller.stop();
  });

  it('does not emit a second goal takeover from the goal incident itself', async () => {
    const { deps, actions } = makeDeps(
      [[base], [{ ...base, homeScore: 1 }], [{ ...base, homeScore: 1 }]],
      [[], [goalIncident], [goalIncident]],
    );
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(actions.filter((a) => a.type === 'takeover')).toHaveLength(1);
    poller.stop();
  });

  it('dispatches stale on fetch failure and keeps polling with backoff', async () => {
    const deps: PollerDeps = {
      fetchLive: vi.fn(async () => { throw new Error('403'); }),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async () => []),
      dispatch: vi.fn(),
    };
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(deps.dispatch).toHaveBeenCalledWith({ type: 'stale' });
    await vi.advanceTimersByTimeAsync(30_000);
    expect((deps.fetchLive as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    poller.stop();
  });

  it('refreshNow triggers an immediate live fetch', async () => {
    const { deps } = makeDeps([[base]], [[]]);
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    const before = (deps.fetchLive as any).mock.calls.length;
    poller.refreshNow();
    await vi.advanceTimersByTimeAsync(0);
    expect((deps.fetchLive as any).mock.calls.length).toBe(before + 1);
    poller.stop();
  });

  it('one match failing incidents does not block another match', async () => {
    const m2: Match = { ...base, id: 2 };
    const actions: Action[] = [];
    const deps: PollerDeps = {
      fetchLive: vi.fn(async () => [base, m2]),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async (id: number) => {
        if (id === 1) throw new Error('boom');
        return [];
      }),
      dispatch: (a: Action) => actions.push(a),
    };
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(actions.some((a) => a.type === 'incidents' && a.matchId === 2)).toBe(true);
    poller.stop();
  });

  it('falls back to the scoring team name when the incidents fetch fails', async () => {
    const actions: Action[] = [];
    let call = 0;
    const deps: PollerDeps = {
      fetchLive: vi.fn(async () => (call++ === 0 ? [base] : [{ ...base, homeScore: 1 }])),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async () => { throw new Error('boom'); }),
      dispatch: (a: Action) => actions.push(a),
    };
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    const t = actions.find((a) => a.type === 'takeover') as Extract<Action, { type: 'takeover' }>;
    expect(t).toBeDefined();
    expect(t.takeover.kind).toBe('goal');
    expect(t.takeover.who).toBe('Argentina');
    poller.stop();
  });

  it('does not replay old incidents after a failed first incidents fetch, but fires for genuinely new ones', async () => {
    const redIncident2: MatchIncident = { ...redIncident, id: 'r2', minute: 60, player: 'E F', playerShort: 'E. F' };
    const actions: Action[] = [];
    let call = 0;
    const deps: PollerDeps = {
      fetchLive: vi.fn(async () => [base]),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async () => {
        call += 1;
        if (call === 1) throw new Error('boom');          // tick 1: fails
        if (call === 2) return [redIncident];             // tick 2: old red card — must NOT fire
        return [redIncident, redIncident2];               // tick 3: r2 is genuinely new — must fire
      }),
      dispatch: (a: Action) => actions.push(a),
    };
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(actions.filter((a) => a.type === 'takeover')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(15_000);
    const takeovers = actions.filter((a) => a.type === 'takeover') as Extract<Action, { type: 'takeover' }>[];
    expect(takeovers).toHaveLength(1);
    expect(takeovers[0].takeover.who).toBe('E F');
    poller.stop();
  });

  it('refreshNow during an in-flight tick does not create a second polling chain', async () => {
    let resolveLive!: (m: Match[]) => void;
    let n = 0;
    const deps: PollerDeps = {
      fetchLive: vi.fn(() => {
        if (++n === 1) return new Promise<Match[]>((r) => { resolveLive = r; });
        return Promise.resolve([]);
      }),
      fetchFixtures: vi.fn(async () => ({ upcoming: [], recent: [] })),
      fetchPredictions: vi.fn(async () => []),
      fetchIncidents: vi.fn(async () => []),
      dispatch: vi.fn(),
    };
    const poller = startPoller(deps);
    await vi.advanceTimersByTimeAsync(0);   // tick 1 starts, hangs on fetchLive
    poller.refreshNow();                     // must NOT start a second tick
    expect((deps.fetchLive as any).mock.calls.length).toBe(1);
    resolveLive([]);
    await vi.advanceTimersByTimeAsync(0);    // tick 1 completes, schedules next
    await vi.advanceTimersByTimeAsync(15_000);
    expect((deps.fetchLive as any).mock.calls.length).toBe(2);  // single chain
    await vi.advanceTimersByTimeAsync(15_000);
    expect((deps.fetchLive as any).mock.calls.length).toBe(3);  // still single chain
    poller.stop();
  });
});
