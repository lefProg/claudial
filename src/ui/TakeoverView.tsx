import { Box, Text } from 'ink';
import type { Takeover } from '../types.js';
import { GOAL_ART, VAR_ART, RED_CARD_ART, spacedCaps } from '../banner.js';
import { ACCENT, RED } from './Header.js';
import { homeTag, awayTag } from './flags.js';

const ART: Record<Takeover['kind'], { art: string[]; color: string; caption: string | null }> = {
  goal: { art: GOAL_ART, color: ACCENT, caption: null },
  redcard: { art: RED_CARD_ART, color: RED, caption: 'R E D   C A R D' },
  var: { art: VAR_ART, color: ACCENT, caption: null },
};

export function TakeoverView({ takeover }: { takeover: Takeover }) {
  const { match, kind } = takeover;
  const { art, color, caption } = ART[kind];
  const fallback = takeover.who ?? (takeover.kind === 'goal'
    ? (takeover.homeScore > takeover.awayScore ? match.home.name : match.away.name)
    : match.home.name);
  const rows = process.stdout.rows ?? 24;

  if (rows < 14) {
    const label = kind === 'goal' ? 'G O A L' : kind === 'redcard' ? 'R E D   C A R D' : 'V A R';
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height={rows - 1}>
        <Text bold color={color} wrap="truncate">{label}</Text>
        <Text bold wrap="truncate">
          {spacedCaps(fallback)}
          {takeover.minute != null ? <Text dimColor>  ·  {takeover.minute}'</Text> : null}
        </Text>
        {takeover.detail ? <Text dimColor wrap="truncate">{takeover.detail}</Text> : null}
        <Text wrap="truncate">
          <Text dimColor>{homeTag(match.home.code)}  </Text>
          <Text bold color={ACCENT}>{takeover.homeScore} — {takeover.awayScore}</Text>
          <Text dimColor>  {awayTag(match.away.code)}</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height={rows - 1}>
      {art.map((line, i) => (
        <Text key={i} bold color={color} wrap="truncate">{line}</Text>
      ))}
      {caption ? (
        <Box marginTop={1}><Text bold color={color} wrap="truncate">{caption}</Text></Box>
      ) : null}
      <Box marginTop={1}>
        <Text bold>
          {spacedCaps(fallback)}
          {takeover.minute != null ? <Text dimColor>  ·  {takeover.minute}'</Text> : null}
        </Text>
      </Box>
      {takeover.detail ? (
        <Box marginTop={1}><Text dimColor>{takeover.detail}</Text></Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>{homeTag(match.home.code)}  </Text>
        <Text bold color={ACCENT}>{takeover.homeScore} — {takeover.awayScore}</Text>
        <Text dimColor>  {awayTag(match.away.code)}</Text>
      </Box>
    </Box>
  );
}
