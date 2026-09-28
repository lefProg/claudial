import { Box, Text, useInput, useApp } from 'ink';
import { ACCENT } from '../ui/Header.js';
import type { SetupOptions } from './flags.js';
import type { Shell } from './detect.js';

/**
 * A single confirmation: install the live-score statusline into Claude Code,
 * and into the Cursor CLI too when Cursor is on this machine.
 */
export function Wizard({ defaultShell, cursorFound, onDone }: {
  defaultShell: Shell; cursorFound: boolean; onDone: (o: SetupOptions) => void;
}) {
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || input.toLowerCase() === 'n') { exit(); return; }
    if (key.return || input.toLowerCase() === 'y') {
      onDone({ statusline: true, cursor: cursorFound, scope: 'global', tmux: false, shell: defaultShell, yes: true, interactive: false });
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Text><Text bold color={ACCENT}>claudial setup</Text></Text>
      <Text>Install the live-score statusline? (Y/n)</Text>
      <Text dimColor>  • Claude Code → ~/.claude/settings.json</Text>
      {cursorFound ? <Text dimColor>  • Cursor CLI → ~/.cursor/cli-config.json</Text> : null}
      <Text dimColor>q to quit</Text>
    </Box>
  );
}
