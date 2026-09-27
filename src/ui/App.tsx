import { useEffect, useReducer, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { initialState, reducer } from '../state.js';
import { startPoller, type Poller, type PollerDeps } from '../engine/poller.js';
import type { Match } from '../types.js';
import { fetchIncidents, fetchLive, fetchRecent, fetchUpcoming, followsNothing, invalidateState, subscribeEvents } from '../api/backend.js';
import { fetchPredictions } from '../predictions/client.js';
import { ACCENT, Header } from './Header.js';
import { DaySection } from './DaySection.js';
import { partitionByDay } from './fixtures.js';
import { UpcomingSection } from './UpcomingSection.js';
import { Footer } from './Footer.js';
import { TakeoverView } from './TakeoverView.js';
import { Ticker } from './Ticker.js';
import { Picker } from './picker/Picker.js';
import { boardNotice } from './notice.js';

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
  const [picking, setPicking] = useState(false);
  // Bumped after the picker saves: the event stream reads settings at connect
  // time, so it has to reconnect to see the new subscriptions.
  const [streamGen, setStreamGen] = useState(0);
  // A new device follows nothing: the board says how to start instead of staying blank.
  const [followsNone, setFollowsNone] = useState(false);

  useEffect(() => {
    followsNothing().then(setFollowsNone, () => {});
  }, [streamGen]);

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

  // Push: any server event (goal, card, kickoff...) triggers an immediate refresh,
  // so takeovers fire within a second instead of on the next 15 s poll.
  useEffect(() => {
    const unsubscribe = subscribeEvents(() => {
      invalidateState();
      pollerRef.current?.refreshNow();
    });
    return unsubscribe;
  }, [streamGen]);

  useInput((input) => {
    if (input === 'q') exit();
    if (input === 'r') pollerRef.current?.refreshNow();
    if (input === 'f' && mode === 'board') setPicking(true);
  }, { isActive: !picking });

  const compact = mode === 'board' && (process.stdout.columns ?? 80) < 70;

  const playing = state.takeovers[0] ?? null;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => dispatch({ type: 'takeoverDone' }), 4_000);
    return () => clearTimeout(t);
  }, [playing]);

  if (picking) {
    return (
      <Picker onDone={(r) => {
        setPicking(false);
        if (r.saved) {
          invalidateState();
          pollerRef.current?.refreshNow();
          setStreamGen((g) => g + 1);
        }
      }} />
    );
  }

  if (playing && mode === 'board') return <TakeoverView takeover={playing} />;

  if (mode === 'ticker') {
    return <Ticker live={state.live} upcoming={state.upcoming} takeover={playing} />;
  }

  const all = dedupeById([...state.live, ...state.recent, ...state.upcoming]);
  const { yesterday, today, future } = partitionByDay(all, Date.now());
  const notice = boardNotice({ followsNone, stale: state.stale, lastUpdated: state.lastUpdated, matchCount: all.length });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Header stale={state.stale} lastUpdated={state.lastUpdated} />
      {notice ? (
        <Box marginBottom={1}>
          {notice === 'offline' ? <Text>Can't reach the claudial server. Retrying…</Text> : null}
          {notice === 'follow-nothing' ? (
            <Text>You don't follow anything yet. Press <Text bold color={ACCENT}>f</Text> to pick your leagues and teams.</Text>
          ) : null}
          {notice === 'no-matches' ? (
            <Text>No upcoming matches for what you follow yet. They show up here as soon as they're scheduled. <Text dimColor>(<Text bold color={ACCENT}>f</Text> to follow more)</Text></Text>
          ) : null}
        </Box>
      ) : null}
      <DaySection label="TODAY" matches={today} incidents={state.incidents} compact={compact} />
      <DaySection label="YESTERDAY" matches={yesterday} incidents={state.incidents} compact={compact} />
      <UpcomingSection matches={future} compact={compact} predictions={state.predictions} />
      <Footer />
    </Box>
  );
}
