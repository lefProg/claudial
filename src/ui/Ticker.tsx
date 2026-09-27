import { Box, Text } from 'ink';
import type { Match, Takeover } from '../types.js';
import { formatKickoff } from './UpcomingSection.js';
import { ACCENT, RED } from './Header.js';
import { spacedCaps } from '../banner.js';
import { homeTag, awayTag } from './flags.js';

function TickerTakeover({ t }: { t: Takeover }) {
  const color = t.kind === 'redcard' ? RED : ACCENT;
  const label = t.kind === 'goal' ? 'G O A L' : t.kind === 'redcard' ? 'R E D' : 'V A R';
  return (
    <Text bold color={color} wrap="truncate">
      {label} · {t.who ? spacedCaps(t.who) : t.detail ?? ''} · {homeTag(t.match.home.code, t.match.home.national)} {t.homeScore}—{t.awayScore} {awayTag(t.match.away.code, t.match.away.national)}
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
          {homeTag(m.home.code, m.home.national)} <Text bold color={ACCENT}>{m.homeScore ?? '–'}—{m.awayScore ?? '–'}</Text> {awayTag(m.away.code, m.away.national)}
          {m.varInProgress ? <Text dimColor> ⚖</Text> : null}
        </Text>
      ))}
      {upcoming[0] ? (
        <Text dimColor wrap="truncate">○ {homeTag(upcoming[0].home.code, upcoming[0].home.national)} — {awayTag(upcoming[0].away.code, upcoming[0].away.national)} {formatKickoff(upcoming[0].startTimestamp)}</Text>
      ) : null}
    </Box>
  );
}
