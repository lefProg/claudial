import { Box, Text } from 'ink';
import type { Match, MatchIncident } from '../types.js';
import { ACCENT } from './Header.js';
import { formatKickoff, kickoffColumn } from './UpcomingSection.js';
import { homeName, awayName } from './flags.js';

/** One side's goals grouped by scorer, in order of their first goal: "43' 50' C. Gakpo · 47' D. Núñez". */
export function scorers(goals: MatchIncident[]): string {
  const byPlayer = new Map<string, string[]>();
  for (const g of goals) {
    const who = g.playerShort ?? '?';
    byPlayer.set(who, [...(byPlayer.get(who) ?? []), `${g.minute ?? '?'}'`]);
  }
  return [...byPlayer].map(([who, mins]) => `${mins.join(' ')} ${who}`).join(' · ');
}

export function ScorerLine({ incidents }: { incidents: MatchIncident[] }) {
  const goals = incidents.filter((i) => i.kind === 'goal');
  if (goals.length === 0) return null;
  const home = scorers(goals.filter((g) => g.isHome));
  const away = scorers(goals.filter((g) => !g.isHome));
  return <Text dimColor>{'   '}⚽ {[home, away].filter(Boolean).join(' | ')}</Text>;
}

export function FeedLine({ incidents }: { incidents: MatchIncident[] }) {
  const feed = incidents.filter((i) => i.kind === 'yellowCard' || i.kind === 'redCard' || i.kind === 'substitution');
  if (feed.length === 0) return null;
  const mark = { yellowCard: '🟨', redCard: '🟥' } as Partial<Record<MatchIncident['kind'], string>>;
  const fmt = (i: MatchIncident) => `${i.minute ?? '?'}' ${mark[i.kind] ?? '⇄'} ${i.playerShort ?? '?'}`;
  // last 4 only — the feed is a pulse, not a log
  return <Text dimColor>{'   '}▪ {feed.slice(-4).map(fmt).join(' · ')}</Text>;
}

function statusLabel(m: Match): string {
  if (m.status === 'halftime') return 'HT';
  if (m.status === 'finished') return 'FT';
  return m.minute != null ? `LIVE ${m.minute}'` : 'LIVE';
}

/** One match row. Upcoming → kickoff line; live/halftime/finished → score + feed. */
export function MatchRow({ m, incidents, compact }: {
  m: Match; incidents: MatchIncident[]; compact?: boolean;
}) {
  if (m.status === 'upcoming') {
    if (compact) {
      return <Text dimColor>○ {homeName(m.home)} — {awayName(m.away)} {formatKickoff(m.startTimestamp)}</Text>;
    }
    return (
      <Text>
        <Text dimColor>○ {kickoffColumn(m.startTimestamp)}</Text>
        {homeName(m.home)} — {awayName(m.away)}
        {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
      </Text>
    );
  }
  if (compact) {
    return (
      <Text>
        <Text color={m.status === 'finished' ? undefined : ACCENT}>⏺</Text>
        <Text dimColor> {statusLabel(m)} </Text>
        {homeName(m.home)} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {awayName(m.away)}
        {m.varInProgress ? <Text dimColor> ⚖</Text> : null}
      </Text>
    );
  }
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text>
        <Text color={m.status === 'finished' ? undefined : ACCENT}>⏺</Text>
        <Text bold={m.status !== 'finished'} dimColor={m.status === 'finished'}> {statusLabel(m)}</Text>
        {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
        {m.varInProgress ? <Text dimColor>  ·  ⚖ VAR</Text> : null}
      </Text>
      <Text>
        {'   '}{homeName(m.home)}  <Text bold color={ACCENT}>{m.homeScore ?? '–'} — {m.awayScore ?? '–'}</Text>  {awayName(m.away)}
      </Text>
      <ScorerLine incidents={incidents} />
      <FeedLine incidents={incidents} />
    </Box>
  );
}
