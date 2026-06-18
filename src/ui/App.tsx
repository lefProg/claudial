import { useEffect, useReducer, useRef } from 'react';
import { Box, useApp, useInput } from 'ink';
import { initialState, reducer } from '../state.js';
import { startPoller, type Poller, type PollerDeps } from '../engine/poller.js';
import type { Match } from '../types.js';
import { fetchIncidents, fetchLive, fetchRecent, fetchUpcoming } from '../api/espn.js';
import { fetchPredictions } from '../predictions/client.js';
import { Header } from './Header.js';
import { DaySection } from './DaySection.js';
import { partitionByDay } from './fixtures.js';
import { UpcomingSection } from './UpcomingSection.js';
import { Footer } from './Footer.js';
import { TakeoverView } from './TakeoverView.js';
import { Ticker } from './Ticker.js';

export type Mode = 'board' | 'ticker';

function dedupeById(matches: Match[]): Match[] {
  const seen = new Set<number>();
  const out: Match[] = [];
  for (const m of matches) if (!seen.has(m.id)) { seen.add(m.id); out.push(m); }
  return out;
}

export function App({ seasonId, mode = 'board' }: { seasonId: number; mode?: Mode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { exit } = useApp();
  const pollerRef = useRef<Poller | null>(null);

  useEffect(() => {
    const deps: PollerDeps = {
      fetchLive,
      fetchFixtures: async () => ({
        upcoming: await fetchUpcoming(seasonId),
        recent: await fetchRecent(seasonId),
      }),
      fetchIncidents,
      fetchPredictions: () => fetchPredictions(),
      dispatch,
    };
    pollerRef.current = startPoller(deps);
    return () => pollerRef.current?.stop();
  }, [seasonId]);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === 'r') pollerRef.current?.refreshNow();
  });

  const compact = mode === 'board' && (process.stdout.columns ?? 80) < 70;

  const playing = state.takeovers[0] ?? null;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => dispatch({ type: 'takeoverDone' }), 4_000);
    return () => clearTimeout(t);
  }, [playing]);

  if (playing && mode === 'board') return <TakeoverView takeover={playing} />;

  if (mode === 'ticker') {
    return <Ticker live={state.live} upcoming={state.upcoming} takeover={playing} />;
  }

  const all = dedupeById([...state.live, ...state.recent, ...state.upcoming]);
  const { yesterday, today, future } = partitionByDay(all, Date.now());

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Header stale={state.stale} lastUpdated={state.lastUpdated} />
      <DaySection label="TODAY" matches={today} incidents={state.incidents} compact={compact} />
      <DaySection label="YESTERDAY" matches={yesterday} incidents={state.incidents} compact={compact} />
      <UpcomingSection matches={future} compact={compact} predictions={state.predictions} />
      <Footer />
    </Box>
  );
}
