import { Box, Text } from 'ink';
import type { Match, MatchIncident } from '../types.js';
import { ACCENT } from './Header.js';
import { formatKickoff } from './UpcomingSection.js';

export function ScorerLine({ incidents }: { incidents: MatchIncident[] }) {
  const goals = incidents.filter((i) => i.kind === 'goal');
  if (goals.length === 0) return null;
  const fmt = (g: MatchIncident) => `${g.minute ?? '?'}' ${g.playerShort ?? '?'}`;
  const home = goals.filter((g) => g.isHome).map(fmt).join(' · ');
  const away = goals.filter((g) => !g.isHome).map(fmt).join(' · ');
  return <Text dimColor>{'   '}⚽ {[home, away].filter(Boolean).join(' | ')}</Text>;
}

export function FeedLine({ incidents }: { incidents: MatchIncident[] }) {
  const feed = incidents.filter((i) => i.kind === 'yellowCard' || i.kind === 'substitution');
  if (feed.length === 0) return null;
  const fmt = (i: MatchIncident) =>
    i.kind === 'yellowCard'
      ? `${i.minute ?? '?'}' 🟨 ${i.playerShort ?? '?'}`
      : `${i.minute ?? '?'}' ⇄ ${i.playerShort ?? '?'}`;
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
      return <Text dimColor>○ {m.home.code}—{m.away.code} {formatKickoff(m.startTimestamp)}</Text>;
    }
    return (
      <Text>
        <Text dimColor>○ {formatKickoff(m.startTimestamp).padEnd(13)}</Text>
        {m.home.name} — {m.away.name}
        {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
      </Text>
    );
  }
  if (compact) {
    return (
      <Text>
        <Text color={m.status === 'finished' ? undefined : ACCENT}>⏺</Text>
        <Text dimColor> {statusLabel(m)} </Text>
        {m.home.code} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {m.away.code}
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
        {'   '}{m.home.name}  <Text bold color={ACCENT}>{m.homeScore ?? '–'} — {m.awayScore ?? '–'}</Text>  {m.away.name}
      </Text>
      <ScorerLine incidents={incidents} />
      <FeedLine incidents={incidents} />
    </Box>
  );
}
