import { Box, Text } from 'ink';
import type { Match } from '../types.js';
import { homeTag, awayTag } from './flags.js';
import type { Prediction } from '../predictions/types.js';
import { matchPrediction } from '../predictions/match.js';
import { fullSlate, headline } from '../predictions/format.js';

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
    const pred = matchPrediction(m, predictions);
    return (
      <Box flexDirection="column">
        <Text dimColor>○ {homeTag(m.home.code)} — {awayTag(m.away.code)} {formatKickoff(m.startTimestamp)}</Text>
        {pred ? <Text color="yellow">{headline(pred)}</Text> : null}
      </Box>
    );
  }
  // Every fixture shows its pick; the NEXT one (shown[0]) gets the full slate.
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>UPCOMING</Text>
      {shown.map((m, i) => {
        const pred = matchPrediction(m, predictions);
        return (
          <Box key={m.id} flexDirection="column">
            <Text>
              <Text dimColor>○ {formatKickoff(m.startTimestamp).padEnd(13)}</Text>
              {homeTag(m.home.code)} — {awayTag(m.away.code)}
              {m.group ? <Text dimColor>  ·  {m.group}</Text> : null}
            </Text>
            {pred && i === 0
              ? fullSlate(pred).map((ln, j) => <Text key={j} color="yellow">{ln}</Text>)
              : pred
                ? <Text color="yellow">   {headline(pred)}</Text>
                : null}
          </Box>
        );
      })}
    </Box>
  );
}
