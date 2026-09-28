import type { Shell } from './detect.js';

export interface SetupOptions {
  statusline: boolean;
  cursor: boolean; // Cursor CLI (cursor-agent) status line
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
  const cursor = has('--cursor');
  // any actionable flag (or --yes) means run without prompting
  const interactive = !(statusline || tmux || cursor || has('--yes'));

  return {
    statusline,
    cursor,
    scope: has('--project') ? 'project' : 'global',
    tmux,
    shell,
    yes: has('--yes'),
    interactive,
  };
}
