import { Box, Text } from 'ink';
import type { Match, Takeover } from '../types.js';
import { formatKickoff } from './UpcomingSection.js';
import { ACCENT, RED } from './Header.js';
import { spacedCaps } from '../banner.js';

function TickerTakeover({ t }: { t: Takeover }) {
  const color = t.kind === 'redcard' ? RED : ACCENT;
  const label = t.kind === 'goal' ? 'G O A L' : t.kind === 'redcard' ? 'R E D' : 'V A R';
  return (
    <Text bold color={color} wrap="truncate">
      {label} · {t.who ? spacedCaps(t.who) : t.detail ?? ''} · {t.match.home.code} {t.homeScore}—{t.awayScore} {t.match.away.code}
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
          {m.home.code} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {m.away.code}
          {m.varInProgress ? <Text dimColor> ⚖</Text> : null}
        </Text>
      ))}
      {upcoming[0] ? (
        <Text dimColor wrap="truncate">○ {upcoming[0].home.code}—{upcoming[0].away.code} {formatKickoff(upcoming[0].startTimestamp)}</Text>
      ) : null}
    </Box>
  );
}
