import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export type Shell = 'zsh' | 'bash' | 'fish';

export function detectShell(env: NodeJS.ProcessEnv = process.env): Shell {
  const s = env.SHELL ?? '';
  if (s.includes('zsh')) return 'zsh';
  if (s.includes('fish')) return 'fish';
  return 'bash';
}

export function rcPathFor(shell: Shell, home: string): string {
  if (shell === 'zsh') return join(home, '.zshrc');
  if (shell === 'fish') return join(home, '.config', 'fish', 'config.fish');
  return join(home, '.bashrc');
}

export function isWindows(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'win32';
}

/** True if `bin` resolves on PATH (so settings can use the bare command). */
export function isOnPath(bin: string): boolean {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  try {
    execFileSync(probe, [bin], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch { return false; }
}

export function hasTmux(): boolean {
  return isOnPath('tmux');
}
