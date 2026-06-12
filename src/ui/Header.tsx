import { Box, Text } from 'ink';

export const ACCENT = '#D97757';
export const RED = '#E5484D';

export function Header({ stale, lastUpdated }: { stale: boolean; lastUpdated: number | null }) {
  const updated = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';
  return (
    <Box marginBottom={1}>
      <Text bold color={ACCENT}>claudial</Text>
      <Text dimColor> · WORLD CUP 2026</Text>
      <Text dimColor>{'  '}✻ {stale ? 'stale · retrying' : `updated ${updated}`}</Text>
    </Box>
  );
}
