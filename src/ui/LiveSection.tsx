import { Box, Text } from 'ink';
import type { Match, MatchIncident } from '../types.js';
import { ACCENT } from './Header.js';

function ScorerLine({ incidents }: { incidents: MatchIncident[] }) {
  const goals = incidents.filter((i) => i.kind === 'goal');
  if (goals.length === 0) return null;
  const fmt = (g: MatchIncident) => `${g.minute ?? '?'}' ${g.playerShort ?? '?'}`;
  const home = goals.filter((g) => g.isHome).map(fmt).join(' · ');
  const away = goals.filter((g) => !g.isHome).map(fmt).join(' · ');
  return <Text dimColor>{'   '}⚽ {[home, away].filter(Boolean).join(' | ')}</Text>;
}

function FeedLine({ incidents }: { incidents: MatchIncident[] }) {
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

export function LiveSection({ matches, recent, incidents, compact }: {
  matches: Match[]; recent: Match[]; incidents: Record<number, MatchIncident[]>; compact?: boolean;
}) {
  const liveIds = new Set(matches.map((m) => m.id));
  const rows = [...matches, ...recent.filter((r) => !liveIds.has(r.id))];
  if (rows.length === 0) return null;
  if (compact) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        {rows.map((m) => (
          <Text key={m.id}>
            <Text color={m.status === 'finished' ? undefined : ACCENT}>⏺</Text>
            <Text dimColor> {statusLabel(m)} </Text>
            {m.home.code} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {m.away.code}
            {m.varInProgress ? <Text dimColor> ⚖</Text> : null}
          </Text>
        ))}
      </Box>
    );
  }
  return (
    <Box flexDirection="column" marginBottom={1}>
      {rows.map((m) => (
        <Box key={m.id} flexDirection="column" marginBottom={1}>
          <Text>
            <Text color={m.status === 'finished' ? undefined : ACCENT}>⏺</Text>
            <Text bold={m.status !== 'finished'} dimColor={m.status === 'finished'}> {statusLabel(m)}</Text>
            {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
            {m.varInProgress ? <Text dimColor>  ·  ⚖ VAR</Text> : null}
          </Text>
          <Text>
            {'   '}{m.home.name}  <Text bold color={ACCENT}>{m.homeScore ?? '–'} — {m.awayScore ?? '–'}</Text>  {m.away.name}
          </Text>
          <ScorerLine incidents={incidents[m.id] ?? []} />
          <FeedLine incidents={incidents[m.id] ?? []} />
        </Box>
      ))}
    </Box>
  );
}
