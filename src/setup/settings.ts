import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export interface StatusLineBlock {
  type: 'command';
  command: string;
  refreshInterval: number;
}

export type Conflict = 'overwrite' | 'keep' | 'abort';

export function statusLineBlock(command: string): StatusLineBlock {
  return { type: 'command', command, refreshInterval: 1 };
}

/** Pure merge. Returns the new settings object and whether it changed. */
export function mergeSettings(
  existing: Record<string, any>,
  block: StatusLineBlock,
  conflict: Conflict,
): { settings: Record<string, any>; changed: boolean } {
  const hasExisting = existing?.statusLine != null;
  if (hasExisting && conflict !== 'overwrite') {
    return { settings: existing, changed: false };
  }
  return { settings: { ...existing, statusLine: block }, changed: true };
}

/** Read → (wrap existing) → merge → (backup) → write. Creates parent dirs and a .bak. */
export function installStatusline(
  settingsPath: string,
  command: string,
  conflict: Conflict,
): { written: boolean; backedUp: boolean; wrapped: boolean } {
  let existing: Record<string, any> = {};
  const fileExists = existsSync(settingsPath);
  if (fileExists) {
    try { existing = JSON.parse(readFileSync(settingsPath, 'utf8')); }
    catch { existing = {}; }
  }

  // Co-exist with a user's existing statusLine: wrap a foreign command so both
  // show (claudial runs theirs via --wrap and appends the score). If ours is
  // already there, preserve any --wrap suffix and just refresh the rest.
  const existingCmd = typeof existing?.statusLine?.command === 'string' ? existing.statusLine.command : '';
  let finalCommand = command;
  let wrapped = false;
  if (existingCmd.includes('claudial --statusline')) {
    const w = existingCmd.indexOf(' --wrap ');
    if (w >= 0) { finalCommand = command + existingCmd.slice(w); wrapped = true; }
  } else if (existingCmd) {
    finalCommand = `${command} --wrap '${existingCmd.replace(/'/g, `'\\''`)}'`;
    wrapped = true;
  }

  const block = statusLineBlock(finalCommand);
  if (existing.statusLine && JSON.stringify(existing.statusLine) === JSON.stringify(block)) {
    return { written: false, backedUp: false, wrapped };
  }
  const { settings, changed } = mergeSettings(existing, block, conflict);
  if (!changed) return { written: false, backedUp: false, wrapped };

  let backedUp = false;
  if (fileExists) { copyFileSync(settingsPath, `${settingsPath}.bak`); backedUp = true; }
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return { written: true, backedUp, wrapped };
}
