import { mkdirSync, readFileSync, appendFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Shell } from './detect.js';

const MARKER = '# claudial — World Cup ticker beside Claude Code';

/** The `claude-mundial` alias, escaped for the target shell. */
export function aliasLine(shell: Shell): string {
  if (shell === 'fish') {
    return `${MARKER}\nalias claude-mundial "tmux new-session 'claude' ; split-window -v -l 5 'claudial --ticker' ; select-pane -U"\n`;
  }
  // zsh + bash share POSIX syntax; tmux command separators escaped as \;
  return `${MARKER}\nalias claude-mundial="tmux new-session 'claude' \\; split-window -v -l 5 'claudial --ticker' \\; select-pane -U"\n`;
}

export function hasAlias(content: string): boolean {
  return content.includes('claude-mundial');
}

/** Append the alias unless one is already present. Creates the file/dir. */
export function appendAlias(rcPath: string, shell: Shell): { appended: boolean } {
  const current = existsSync(rcPath) ? readFileSync(rcPath, 'utf8') : '';
  if (hasAlias(current)) return { appended: false };
  mkdirSync(dirname(rcPath), { recursive: true });
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  appendFileSync(rcPath, `${prefix}\n${aliasLine(shell)}`);
  return { appended: true };
}
