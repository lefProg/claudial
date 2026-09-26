import { useEffect, useReducer, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { ACCENT, RED } from '../Header.js';
import {
  getSettings, listLeagues, listTeams, markOnboarded, putSettings,
  type LeagueInfo, type Settings, type TeamInfo,
} from '../../api/backend.js';
import {
  followedIn, initialPickerState, pickerReducer, rows, settingsOf, stillLoading, teamName,
  type PickerState, type Row,
} from './state.js';

// "What do you follow?": type a team's name, tick it with space, esc to save.
// Leagues show when the search is empty; enter opens one to browse its teams.

export interface PickerApi {
  listLeagues: () => Promise<LeagueInfo[]>;
  listTeams: (slug: string) => Promise<TeamInfo[]>;
  getSettings: () => Promise<Settings>;
  putSettings: (s: Settings) => Promise<Settings>;
  markOnboarded: () => Promise<void>;
}

const defaultApi: PickerApi = { listLeagues, listTeams, getSettings, putSettings, markOnboarded };

export interface PickerResult { saved: boolean; settings: Settings }

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'saving' }
  | { kind: 'saved'; settings: Settings }
  | { kind: 'error'; message: string };

export function Picker({ onDone, api = defaultApi, intro }: {
  onDone: (r: PickerResult) => void;
  api?: PickerApi;
  intro?: string;
}) {
  const [s, dispatch] = useReducer(pickerReducer, initialPickerState);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const { stdout } = useStdout();
  // Every line of chrome counted (padding 2, title 2, intro 2, search 1, list margins 2,
  // more-arrows 2, summary 1, status 1, help 1), plus one spare: a frame taller than the
  // terminal cannot be cleared by Ink and leaves stale lines behind.
  const height = Math.max(3, (stdout?.rows ?? 24) - (intro ? 16 : 14));

  // Load leagues and current settings, then every league's teams in parallel,
  // so search works across all of them.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [leagues, settings] = await Promise.all([api.listLeagues(), api.getSettings()]);
        if (!alive) return;
        dispatch({ type: 'loaded', leagues, settings });
        setPhase({ kind: 'ready' });
        for (const l of leagues) {
          dispatch({ type: 'teamsLoaded', slug: l.slug, teams: 'loading' });
          api.listTeams(l.slug).then(
            (teams) => alive && dispatch({ type: 'teamsLoaded', slug: l.slug, teams }),
            () => alive && dispatch({ type: 'teamsLoaded', slug: l.slug, teams: 'error' }),
          );
        }
      } catch (e) {
        if (alive) setPhase({ kind: 'error', message: `could not reach the claudial server (${e instanceof Error ? e.message : String(e)})` });
      }
    })();
    return () => { alive = false; };
  }, [api]);

  // Esc on the home screen: save if anything changed, then hand back.
  useEffect(() => {
    if (!s.finished) return;
    const settings = settingsOf(s);
    if (!s.dirty) { onDone({ saved: false, settings }); return; }
    setPhase({ kind: 'saving' });
    api.putSettings(settings)
      .then(async (stored) => {
        await api.markOnboarded().catch(() => {});
        setPhase({ kind: 'saved', settings: stored });
        setTimeout(() => onDone({ saved: true, settings: stored }), 900);
      })
      .catch((e) => {
        setPhase({ kind: 'error', message: `not saved: ${e instanceof Error ? e.message : String(e)}. Press esc to try again.` });
        dispatch({ type: 'resume' });
      });
  }, [s.finished]); // eslint-disable-line react-hooks/exhaustive-deps

  useInput((input, key) => {
    if (phase.kind === 'saving' || phase.kind === 'saved') return;
    if (phase.kind === 'loading') { if (key.escape) onDone({ saved: false, settings: settingsOf(s) }); return; }
    if (phase.kind === 'error' && s.leagues.length === 0) { if (key.escape) onDone({ saved: false, settings: settingsOf(s) }); return; }
    if (key.upArrow) dispatch({ type: 'up' });
    else if (key.downArrow) dispatch({ type: 'down' });
    else if (key.pageUp) dispatch({ type: 'pageUp', by: height });
    else if (key.pageDown) dispatch({ type: 'pageDown', by: height });
    else if (key.escape) dispatch({ type: 'escape' });
    else if (key.leftArrow) dispatch({ type: 'back' });
    else if (key.return || key.rightArrow) dispatch({ type: 'open' });
    else if (key.backspace || key.delete) dispatch({ type: 'backspace' });
    else if (input === ' ') dispatch({ type: 'toggle' });
    else if (input && !key.ctrl && !key.meta && !key.tab) dispatch({ type: 'type', text: input });
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold color={ACCENT}>claudial</Text>
        <Text dimColor> · what do you follow?</Text>
      </Box>
      {intro && <Box marginBottom={1}><Text>{intro}</Text></Box>}
      <Body s={s} phase={phase} height={height} />
    </Box>
  );
}

function Body({ s, phase, height }: { s: PickerState; phase: Phase; height: number }) {
  if (phase.kind === 'loading') return <Text dimColor>loading leagues…</Text>;
  if (phase.kind === 'error' && s.leagues.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={RED}>{phase.message}</Text>
        <Text dimColor>Is the server reachable? Set CLAUDIAL_API_URL if you run your own. esc to close</Text>
      </Box>
    );
  }
  if (phase.kind === 'saved') {
    const names = [
      ...phase.settings.leagues.map((slug) => s.leagues.find((l) => l.slug === slug)?.name ?? slug),
      ...phase.settings.teams.map((id) => teamName(s, id)),
    ];
    return (
      <Box flexDirection="column">
        <Text>
          <Text color={ACCENT}>✓ Saved.</Text>{' '}
          {names.length ? <>You follow <Text bold>{names.join(' · ')}</Text>.</> : 'You follow nothing for now.'}
        </Text>
        <Text dimColor>Your Claude Code status bar picks it up on its next refresh. Change it any time: claudial follow</Text>
      </Box>
    );
  }

  const list = rows(s);
  const start = Math.max(0, Math.min(s.cursor - Math.floor(height / 2), list.length - height));
  const shown = list.slice(start, start + height);
  const leagueName = (slug: string) => s.leagues.find((l) => l.slug === slug)?.name ?? slug;

  return (
    <Box flexDirection="column">
      <SearchLine s={s} leagueName={leagueName} />
      <Box flexDirection="column" marginY={1}>
        {start > 0 && <Text dimColor>   ↑ {start} more</Text>}
        {shown.map((row, i) => (
          <RowLine key={row.kind === 'league' ? `l-${row.slug}` : `t-${row.id}`} row={row} s={s}
            active={start + i === s.cursor} showLeague={s.view.kind === 'home'} leagueName={leagueName} />
        ))}
        {list.length === 0 && <Empty s={s} />}
        {start + height < list.length && <Text dimColor>   ↓ {list.length - start - height} more</Text>}
      </Box>
      <Summary s={s} leagueName={leagueName} />
      {phase.kind === 'saving' && <Text dimColor>saving…</Text>}
      {phase.kind === 'error' && <Text color={RED}>{phase.message}</Text>}
      <Help s={s} />
    </Box>
  );
}

function SearchLine({ s, leagueName }: { s: PickerState; leagueName: (slug: string) => string }) {
  const where = s.view.kind === 'league' ? `${leagueName(s.view.slug)} › ` : '';
  return (
    <Text>
      <Text dimColor>{where}search › </Text>
      {s.query
        ? <Text bold>{s.query}<Text color={ACCENT}>▏</Text></Text>
        : <Text dimColor>{s.view.kind === 'league' ? 'type to filter teams' : 'type a team name, e.g. "arsenal"'}<Text color={ACCENT}>▏</Text></Text>}
    </Text>
  );
}

function RowLine({ row, s, active, showLeague, leagueName }: {
  row: Row; s: PickerState; active: boolean; showLeague: boolean; leagueName: (slug: string) => string;
}) {
  const on = row.kind === 'league' ? s.followLeagues.includes(row.slug) : s.followTeams.includes(row.id);
  const mark = on ? <Text color={ACCENT}>◉</Text> : <Text dimColor>○</Text>;
  const pointer = active ? <Text color={ACCENT}>›</Text> : ' ';
  if (row.kind === 'league') {
    const teams = followedIn(s, row.slug);
    return (
      <Text wrap="truncate">
        {pointer} {mark} <Text bold={active}>{row.name}</Text>
        {teams.length > 0 && <Text color={ACCENT}>{'  '}{teams.join(', ')}</Text>}
        {active && <Text dimColor>{'  '}enter: teams</Text>}
      </Text>
    );
  }
  return (
    <Text wrap="truncate">
      {pointer} {mark} <Text bold={active}>{row.name}</Text>
      <Text dimColor>{'  '}{row.code}{showLeague ? ` · ${leagueName(row.league)}` : ''}</Text>
    </Text>
  );
}

function Empty({ s }: { s: PickerState }) {
  if (s.view.kind === 'league') {
    const list = s.teams[s.view.slug];
    if (list === 'loading' || list === undefined) return <Text dimColor>   loading teams…</Text>;
    if (list === 'error') return <Text dimColor>   this league's teams are not available yet, try again in a minute</Text>;
  }
  if (s.query && stillLoading(s)) return <Text dimColor>   searching… (team lists still loading)</Text>;
  return <Text dimColor>   no team matches "{s.query}"</Text>;
}

function Summary({ s, leagueName }: { s: PickerState; leagueName: (slug: string) => string }) {
  const parts = [...s.followLeagues.map(leagueName), ...s.followTeams.map((id) => teamName(s, id))];
  if (parts.length === 0) return <Text dimColor>You follow nothing yet: tick a league or a team.</Text>;
  return (
    <Text wrap="truncate">
      <Text dimColor>Following </Text><Text color={ACCENT}>{parts.join(' · ')}</Text>
    </Text>
  );
}

function Help({ s }: { s: PickerState }) {
  const exit = s.query ? 'esc clear search' : s.view.kind === 'league' ? 'esc back' : 'esc save & close';
  const enter = s.view.kind === 'home' && !s.query ? ' · enter open league' : '';
  return <Text dimColor wrap="truncate">↑↓ move · space follow{enter} · type to search · {exit} · ctrl+c cancel</Text>;
}
