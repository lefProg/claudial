import { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { ACCENT } from '../ui/Header.js';
import type { SetupOptions } from './flags.js';
import type { Shell } from './detect.js';

type Step = 'statusline' | 'scope' | 'tmux' | 'shell' | 'confirm';

export function Wizard({ defaultShell, allowTmux, onDone }: {
  defaultShell: Shell; allowTmux: boolean; onDone: (o: SetupOptions) => void;
}) {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('statusline');
  const [statusline, setStatusline] = useState(true);
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const [tmux, setTmux] = useState(false);
  const [shell, setShell] = useState<Shell>(defaultShell);

  const finish = () => {
    onDone({ statusline, scope, tmux, shell, yes: true, interactive: false });
    exit();
  };

  useInput((input, key) => {
    const yes = input.toLowerCase() === 'y';
    const no = input.toLowerCase() === 'n';
    if (input === 'q') { exit(); return; }

    if (step === 'statusline') {
      if (yes || key.return) { setStatusline(true); setStep('scope'); }
      else if (no) { setStatusline(false); setStep(allowTmux ? 'tmux' : 'confirm'); }
    } else if (step === 'scope') {
      if (input === 'g' || key.return) { setScope('global'); setStep(allowTmux ? 'tmux' : 'confirm'); }
      else if (input === 'p') { setScope('project'); setStep(allowTmux ? 'tmux' : 'confirm'); }
    } else if (step === 'tmux') {
      if (yes) { setTmux(true); setStep('shell'); }
      else if (no || key.return) { setTmux(false); setStep('confirm'); }
    } else if (step === 'shell') {
      if (input === 'z') setShell('zsh');
      else if (input === 'b') setShell('bash');
      else if (input === 'f') setShell('fish');
      if (key.return || 'zbf'.includes(input)) setStep('confirm');
    } else if (step === 'confirm') {
      if (yes || key.return) finish();
      else if (no) exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Text><Text bold color={ACCENT}>claudial setup</Text></Text>
      {step === 'statusline' && <Text>Add the live-score statusline inside Claude Code? (Y/n)</Text>}
      {step === 'scope' && <Text>Scope — [g]lobal (~/.claude) or [p]roject (.claude)? (G/p)</Text>}
      {step === 'tmux' && <Text>Also add the tmux ticker alias (claude-mundial)? (y/N)</Text>}
      {step === 'shell' && <Text>Shell for the alias — [z]sh [b]ash [f]ish? (default {shell})</Text>}
      {step === 'confirm' && (
        <Box flexDirection="column">
          <Text>About to apply:</Text>
          {statusline && <Text dimColor>  • statusline → {scope}</Text>}
          {tmux && <Text dimColor>  • tmux alias → {shell}</Text>}
          {!statusline && !tmux && <Text dimColor>  • nothing selected</Text>}
          <Text>Proceed? (Y/n)</Text>
        </Box>
      )}
      <Text dimColor>q to quit</Text>
    </Box>
  );
}
