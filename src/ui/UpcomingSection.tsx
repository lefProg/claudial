import { Box, Text } from 'ink';
import type { Match } from '../types.js';
import { homeTag, awayTag } from './flags.js';
import type { Prediction } from '../predictions/types.js';
import { matchPrediction } from '../predictions/match.js';
import { fullSlate } from '../predictions/format.js';

export function formatKickoff(ts: number, now: number = Date.now()): string {
  const d = new Date(ts * 1000);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date(now).toDateString();
  if (sameDay) return time;
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${day} ${time}`;
}

export function UpcomingSection({
  matches,
  compact,
  predictions = [],
}: {
  matches: Match[];
  compact?: boolean;
  predictions?: Prediction[];
}) {
  const shown = matches.slice(0, compact ? 1 : 8);
  if (shown.length === 0) return null;
  if (compact) {
    const m = shown[0];
    return (
      <Text dimColor>○ {homeTag(m.home.code)} — {awayTag(m.away.code)} {formatKickoff(m.startTimestamp)}</Text>
    );
  }
  // The full prediction slate is shown beside the NEXT fixture only (shown[0]).
  const nextPred = matchPrediction(shown[0], predictions);
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>UPCOMING</Text>
      {shown.map((m, i) => (
        <Box key={m.id} flexDirection="column">
          <Text>
            <Text dimColor>○ {formatKickoff(m.startTimestamp).padEnd(13)}</Text>
            {homeTag(m.home.code)} — {awayTag(m.away.code)}
            {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
          </Text>
          {i === 0 && nextPred
            ? fullSlate(nextPred).map((ln, j) => (
                <Text key={j} color="yellow">{ln}</Text>
              ))
            : null}
        </Box>
      ))}
    </Box>
  );
}
