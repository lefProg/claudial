import { useEffect, useReducer, useRef } from 'react';
import { Box, useApp, useInput } from 'ink';
import { initialState, reducer } from '../state.js';
import { startPoller, type Poller, type PollerDeps } from '../engine/poller.js';
import { fetchIncidents, fetchLive, fetchRecent, fetchUpcoming } from '../api/espn.js';
import { Header } from './Header.js';
import { LiveSection } from './LiveSection.js';
import { UpcomingSection } from './UpcomingSection.js';
import { Footer } from './Footer.js';
import { TakeoverView } from './TakeoverView.js';
import { Ticker } from './Ticker.js';

export type Mode = 'board' | 'ticker';

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

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Header stale={state.stale} lastUpdated={state.lastUpdated} />
      <LiveSection matches={state.live} recent={state.recent} incidents={state.incidents} compact={compact} />
      <UpcomingSection matches={state.upcoming} compact={compact} />
      <Footer />
    </Box>
  );
}
