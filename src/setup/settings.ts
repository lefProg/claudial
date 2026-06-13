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

/** Read → merge → (backup) → write. Creates parent dirs and a .bak. */
export function installStatusline(
  settingsPath: string,
  command: string,
  conflict: Conflict,
): { written: boolean; backedUp: boolean } {
  let existing: Record<string, any> = {};
  const fileExists = existsSync(settingsPath);
  if (fileExists) {
    try { existing = JSON.parse(readFileSync(settingsPath, 'utf8')); }
    catch { existing = {}; }
  }
  const { settings, changed } = mergeSettings(existing, statusLineBlock(command), conflict);
  if (!changed) return { written: false, backedUp: false };

  let backedUp = false;
  if (fileExists) { copyFileSync(settingsPath, `${settingsPath}.bak`); backedUp = true; }
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return { written: true, backedUp };
}
