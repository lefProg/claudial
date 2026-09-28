import { Box, Text } from 'ink';
import type { Match } from '../types.js';
import { homeName, awayName } from './flags.js';
import type { Prediction } from '../predictions/types.js';
import { matchPrediction } from '../predictions/match.js';
import { fullSlate, headline } from '../predictions/format.js';

export function formatKickoff(ts: number, now: number = Date.now()): string {
  const d = new Date(ts * 1000);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date(now).toDateString();
  if (sameDay) return time;
  // Within the week a weekday is enough; further out (fixtures reach ~3 weeks) add the date.
  const soon = ts * 1000 - now < 6 * 86_400_000;
  const day = d.toLocaleDateString(undefined, soon ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} ${time}`;
}

/** The kickoff padded to `width` (default: fits the longest date format), always followed by a space. */
export function kickoffColumn(ts: number, now: number = Date.now(), width: number = 22): string {
  const k = formatKickoff(ts, now);
  return k.length >= width - 1 ? `${k} ` : k.padEnd(width);
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
  // One column for the whole list: as wide as its longest kickoff, plus a gap.
  const width = Math.max(...shown.map((m) => formatKickoff(m.startTimestamp).length)) + 2;
  if (compact) {
    const m = shown[0];
    const pred = matchPrediction(m, predictions);
    return (
      <Box flexDirection="column">
        <Text dimColor>○ {homeName(m.home)} — {awayName(m.away)} {formatKickoff(m.startTimestamp)}</Text>
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
              <Text dimColor>○ {kickoffColumn(m.startTimestamp, Date.now(), width)}</Text>
              {homeName(m.home)} — {awayName(m.away)}
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
