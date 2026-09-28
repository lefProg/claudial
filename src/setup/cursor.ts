import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The Cursor CLI (cursor-agent) status line: the same `claudial --statusline`
// command as Claude Code, in ~/.cursor/cli-config.json with Cursor's own keys.

export function cursorConfigPath(home: string): string {
  return join(home, '.cursor', 'cli-config.json');
}

function block(command: string) {
  return { type: 'command', command, padding: 0, updateIntervalMs: 1000, timeoutMs: 3000 };
}

/** Read → (wrap a foreign command) → merge → (backup) → write. Same rules as the Claude Code writer. */
export function installCursorStatusline(path: string, command: string): { written: boolean; backedUp: boolean; wrapped: boolean } {
  const fileExists = existsSync(path);
  let existing: Record<string, any> = {};
  if (fileExists) {
    try { existing = JSON.parse(readFileSync(path, 'utf8')); } catch { existing = {}; }
  }
  const theirs = typeof existing?.statusLine?.command === 'string' ? existing.statusLine.command : '';
  let final = command;
  let wrapped = false;
  if (theirs.includes('claudial --statusline')) {
    const w = theirs.indexOf(' --wrap ');
    if (w >= 0) { final = command + theirs.slice(w); wrapped = true; }
  } else if (theirs) {
    final = `${command} --wrap '${theirs.replace(/'/g, `'\\''`)}'`;
    wrapped = true;
  }
  const next = block(final);
  if (JSON.stringify(existing.statusLine) === JSON.stringify(next)) return { written: false, backedUp: false, wrapped };
  let backedUp = false;
  if (fileExists) { copyFileSync(path, `${path}.bak`); backedUp = true; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...existing, statusLine: next }, null, 2) + '\n');
  return { written: true, backedUp, wrapped };
}
