import { Box, Text } from 'ink';
import type { Match } from '../types.js';
import { homeTag, awayTag } from './flags.js';

export function formatKickoff(ts: number, now: number = Date.now()): string {
  const d = new Date(ts * 1000);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date(now).toDateString();
  if (sameDay) return time;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${day} ${time}`;
}

export function UpcomingSection({ matches, compact }: { matches: Match[]; compact?: boolean }) {
  const shown = matches.slice(0, compact ? 1 : 8);
  if (shown.length === 0) return null;
  if (compact) {
    const m = shown[0];
    return (
      <Text dimColor>○ {homeTag(m.home.code)} — {awayTag(m.away.code)} {formatKickoff(m.startTimestamp)}</Text>
    );
  }
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>UPCOMING</Text>
      {shown.map((m) => (
        <Text key={m.id}>
          <Text dimColor>○ {formatKickoff(m.startTimestamp).padEnd(13)}</Text>
          {homeTag(m.home.code)} — {awayTag(m.away.code)}
          {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
        </Text>
      ))}
    </Box>
  );
}
