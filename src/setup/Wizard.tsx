import { Box, Text, useInput, useApp } from 'ink';
import { ACCENT } from '../ui/Header.js';
import type { SetupOptions } from './flags.js';
import type { Shell } from './detect.js';

/**
 * A single confirmation: install the live-score statusline globally into Claude
 * Code. No scope or tmux prompts — global is the one supported path.
 */
export function Wizard({ defaultShell, onDone }: {
  defaultShell: Shell; onDone: (o: SetupOptions) => void;
}) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || input.toLowerCase() === 'n') { exit(); return; }
    if (key.return || input.toLowerCase() === 'y') {
      onDone({ statusline: true, scope: 'global', tmux: false, shell: defaultShell, yes: true, interactive: false });
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Text><Text bold color={ACCENT}>claudial setup</Text></Text>
      <Text>Install the live-score statusline into Claude Code? (Y/n)</Text>
      <Text dimColor>  • statusline → global (~/.claude/settings.json)</Text>
      <Text dimColor>q to quit</Text>
    </Box>
  );
}
