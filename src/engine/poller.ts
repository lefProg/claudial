import { diffGoals, diffIncidents } from './diff.js';
import type { Match, MatchIncident, Takeover } from '../types.js';
import type { Prediction } from '../predictions/types.js';
import type { Action } from '../state.js';

export interface PollerDeps {
  fetchLive(): Promise<Match[]>;
  fetchFixtures(): Promise<{ upcoming: Match[]; recent: Match[] }>;
  fetchIncidents(eventId: number): Promise<MatchIncident[]>;
  fetchPredictions(): Promise<Prediction[]>;
  dispatch(a: Action): void;
}

export interface PollerOpts {
  liveMs?: number;
  fixturesMs?: number;
}

export interface Poller {
  stop(): void;
  refreshNow(): void;
}

export function startPoller(deps: PollerDeps, opts: PollerOpts = {}): Poller {
  const liveMs = opts.liveMs ?? 15_000;
  const fixturesMs = opts.fixturesMs ?? 300_000;
  let prev: Match[] = [];
  const seenIncidents = new Map<number, Set<string>>(); // matchId → incident ids
  let failures = 0;
  let stopped = false;
  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  let fixturesTimer: ReturnType<typeof setTimeout> | undefined;
  let ticking = false;

  function takeoverFor(i: MatchIncident, m: Match): Takeover | null {
    if (i.kind === 'redCard') {
      return {
        kind: 'redcard', match: m, who: i.player ?? (i.isHome ? m.home.name : m.away.name), detail: null,
        minute: i.minute, homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0,
      };
    }
    if (i.kind === 'var') {
      return {
        kind: 'var', match: m, who: i.player ?? (i.isHome ? m.home.name : m.away.name), detail: i.detail,
        minute: i.minute, homeScore: m.homeScore ?? 0, awayScore: m.awayScore ?? 0,
      };
    }
    return null;
  }

  async function liveTick(): Promise<void> {
    if (ticking) return;
    ticking = true;
    try {
      const matches = await deps.fetchLive();
      const scoreChanges = diffGoals(prev, matches);
      prev = matches;
      deps.dispatch({ type: 'live', matches, at: Date.now() });
      failures = 0;

      for (const m of matches) {
        // A match only counts as "first sight" until its first SUCCESSFUL incidents
        // fetch. We must NOT insert into seenIncidents until the fetch succeeds;
        // otherwise a failed first fetch leaves an empty set in the map, and on the
        // next tick old (pre-launch) incidents are diffed against that empty set and
        // replayed as fresh — violating the no-replay contract.
        const firstSight = !seenIncidents.has(m.id);

        // Attempt to fetch incidents; on failure, incidents stays empty and we
        // skip dispatching 'incidents' and running diffIncidents — but we still
        // process score-diff takeovers (scorer-less) so goals are never dropped.
        let incidents: MatchIncident[] = [];
        let incidentsFetched = false;
        try {
          incidents = await deps.fetchIncidents(m.id);
          incidentsFetched = true;
        } catch {
          // intentional: degrade to scorer-less takeovers rather than dropping them
        }

        if (incidentsFetched) {
          // Only register the match in seenIncidents on first SUCCESSFUL fetch.
          if (firstSight) seenIncidents.set(m.id, new Set());
          const seen = seenIncidents.get(m.id)!;

          deps.dispatch({ type: 'incidents', matchId: m.id, incidents });

          // Red cards & VAR come from the incident diff — but never on first sight
          // (prevents replaying stale events when a match is first seen mid-game).
          // Goal/yellow/sub/injuryTime incidents never fire takeovers from this path
          // (goal takeovers are deduped via the score-diff path above).
          // diffIncidents is always called (even on firstSight) to populate seen set.
          const fresh = diffIncidents(seen, incidents);
          if (!firstSight) {
            for (const i of fresh) {
              const t = takeoverFor(i, m);
              if (t) deps.dispatch({ type: 'takeover', takeover: t });
            }
          }
        }

        // Goal takeovers come from the score diff (faster + reliable),
        // enriched with the scorer from the freshest incident list.
        // If incidents fetch failed, incidents is [] so scorer will be null — degraded but not dropped.
        for (const c of scoreChanges.filter((c) => c.matchId === m.id)) {
          const g = [...incidents].reverse().find((x) => x.kind === 'goal' && x.isHome === (c.side === 'home'));
          deps.dispatch({
            type: 'takeover',
            takeover: {
              kind: 'goal', match: m, who: g?.player ?? (c.side === 'home' ? m.home.name : m.away.name), detail: g?.detail ?? null,
              minute: g?.minute ?? m.minute, homeScore: c.homeScore, awayScore: c.awayScore,
            },
          });
        }
      }
    } catch {
      failures += 1;
      deps.dispatch({ type: 'stale' });
    }
    ticking = false;
    if (!stopped) {
      const delay = Math.min(liveMs * 2 ** Math.min(failures, 5), 300_000);
      liveTimer = setTimeout(liveTick, delay);
    }
  }

  async function fixturesTick(): Promise<void> {
    try {
      const { upcoming, recent } = await deps.fetchFixtures();
      deps.dispatch({ type: 'fixtures', upcoming, recent });
    } catch {
      deps.dispatch({ type: 'stale' });
    }
    // Predictions ride the gentle fixtures cadence. fetchPredictions is
    // fail-silent (returns [] when disabled or on error), so this never
    // disturbs the board.
    const predictions = await deps.fetchPredictions();
    if (predictions.length > 0) deps.dispatch({ type: 'predictions', predictions });
    if (!stopped) fixturesTimer = setTimeout(fixturesTick, fixturesMs);
  }

  void liveTick();
  void fixturesTick();

  return {
    stop() {
      stopped = true;
      clearTimeout(liveTimer);
      clearTimeout(fixturesTimer);
    },
    refreshNow() {
      clearTimeout(liveTimer);
      void liveTick();
    },
  };
}
