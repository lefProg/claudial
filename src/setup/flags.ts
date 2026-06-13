import type { Shell } from './detect.js';

export interface SetupOptions {
  statusline: boolean;
  scope: 'global' | 'project';
  tmux: boolean;
  shell: Shell | null;
  yes: boolean;
  interactive: boolean;
}

const SHELLS: Shell[] = ['zsh', 'bash', 'fish'];

export function parseFlags(args: string[]): SetupOptions {
  const has = (f: string) => args.includes(f);
  const shellArg = args[args.indexOf('--shell') + 1];
  const shell = SHELLS.includes(shellArg as Shell) ? (shellArg as Shell) : null;

  const statusline = has('--statusline');
  const tmux = has('--tmux');
  // any actionable flag (or --yes) means run without prompting
  const interactive = !(statusline || tmux || has('--yes'));

  return {
    statusline,
    scope: has('--project') ? 'project' : 'global',
    tmux,
    shell,
    yes: has('--yes'),
    interactive,
  };
}
