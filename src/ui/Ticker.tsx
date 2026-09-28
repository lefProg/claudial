import { Box, Text } from 'ink';
import type { Match, Takeover } from '../types.js';
import { formatKickoff } from './kickoff.js';
import { ACCENT, RED } from './Header.js';
import { spacedCaps } from '../banner.js';
import { homeName, awayName } from './flags.js';

function TickerTakeover({ t }: { t: Takeover }) {
  const color = t.kind === 'redcard' ? RED : ACCENT;
  const label = t.kind === 'goal' ? 'G O A L' : t.kind === 'redcard' ? 'R E D' : 'V A R';
  return (
    <Text bold color={color} wrap="truncate">
      {label} · {t.who ? spacedCaps(t.who) : t.detail ?? ''} · {homeName(t.match.home)} {t.homeScore}—{t.awayScore} {awayName(t.match.away)}
    </Text>
  );
}

export function Ticker({ live, upcoming, takeover }: {
  live: Match[]; upcoming: Match[]; takeover: Takeover | null;
}) {
  if (takeover) return <TickerTakeover t={takeover} />;
  return (
    <Box flexDirection="column">
      {live.slice(0, 3).map((m) => (
        <Text key={m.id} wrap="truncate">
          <Text color={ACCENT}>⏺</Text>
          <Text dimColor> {m.minute != null ? `${m.minute}'` : m.status === 'halftime' ? 'HT' : m.status === 'finished' ? 'FT' : ''} </Text>
          {homeName(m.home)} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {awayName(m.away)}
          {m.varInProgress ? <Text dimColor> ⚖</Text> : null}
        </Text>
      ))}
      {upcoming[0] ? (
        <Text dimColor wrap="truncate">○ {homeName(upcoming[0].home)} — {awayName(upcoming[0].away)} {formatKickoff(upcoming[0].startTimestamp)}</Text>
      ) : null}
    </Box>
  );
}
