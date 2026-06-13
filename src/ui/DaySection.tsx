import { Box, Text } from 'ink';
import type { Match, MatchIncident } from '../types.js';
import { MatchRow } from './MatchRow.js';

/** A labelled group of match rows (e.g. TODAY / YESTERDAY). Hidden when empty. */
export function DaySection({ label, matches, incidents, compact }: {
  label: string; matches: Match[]; incidents: Record<number, MatchIncident[]>; compact?: boolean;
}) {
  if (matches.length === 0) return null;
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text dimColor>{label}</Text>
      {matches.map((m) => (
        <MatchRow key={m.id} m={m} incidents={incidents[m.id] ?? []} compact={compact} />
      ))}
    </Box>
  );
}
