import {
  mkdirSync, openSync, closeSync, writeFileSync, readFileSync,
  renameSync, statSync, existsSync, unlinkSync, utimesSync, futimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Match } from '../types.js';
import { homeTag, awayTag } from '../ui/flags.js';

export const TTL_MS = 10_000;
export const GOAL_WINDOW_MS = 15_000;
const LOCK_STALE_MS = 30_000;

// ACCENT #D97757 → truecolor; bold. Matches the old bash celebration styling.
const GOAL_OPEN = '\x1b[1;38;2;217;119;87m';
const GOAL_CLOSE = '\x1b[0m';

function goalText(m: Match): string {
  return `${GOAL_OPEN}⚽ G O O O L  ·  ${homeTag(m.home.code)} ${m.homeScore ?? 0}—${m.awayScore ?? 0} ${awayTag(m.away.code)}${GOAL_CLOSE}`;
}

export interface StatuslineCache {
  read(now?: number): { line: string; ageMs: number } | null;
  write(line: string, now?: number): void;
  tryLock(now?: number): boolean;
  unlock(): void;
  updateGoalState(live: Match[], now?: number): void;
  armGoal(match: Match, now?: number): void;
  activeGoalLine(now?: number): string | null;
}

export function makeCache(dir: string = join(tmpdir(), 'claudial-statusline')): StatuslineCache {
  mkdirSync(dir, { recursive: true });
  const cacheFile = join(dir, 'line');
  const lockFile = join(dir, 'lock');
  const stateFile = join(dir, 'goals.json');
  const goalFile = join(dir, 'goal');
  const goalTsFile = join(dir, 'goalts');

  const atomicWrite = (path: string, data: string) => {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, data);
    renameSync(tmp, path);
  };
  const readJson = (path: string): Record<string, number> => {
    try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
  };
  const totals = (live: Match[]): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const m of live) out[String(m.id)] = (m.homeScore ?? 0) + (m.awayScore ?? 0);
    return out;
  };

  return {
    read(now = Date.now()) {
      if (!existsSync(cacheFile)) return null;
      const line = readFileSync(cacheFile, 'utf8');
      const ageMs = now - statSync(cacheFile).mtimeMs;
      return { line, ageMs };
    },
    write(line, now = Date.now()) {
      atomicWrite(cacheFile, line);
      const t = now / 1000;
      try { utimesSync(cacheFile, t, t); } catch { /* best effort */ }
    },
    tryLock(now = Date.now()) {
      if (existsSync(lockFile)) {
        const age = now - statSync(lockFile).mtimeMs;
        if (age > LOCK_STALE_MS) { try { unlinkSync(lockFile); } catch { /* race */ } }
      }
      try {
        const fd = openSync(lockFile, 'wx');
        const t = now / 1000;
        try { futimesSync(fd, t, t); } catch { /* best effort */ }
        closeSync(fd);
        return true;
      } catch { return false; }
    },
    unlock() { try { unlinkSync(lockFile); } catch { /* already gone */ } },
    updateGoalState(live, now = Date.now()) {
      const prev = readJson(stateFile);
      const cur = totals(live);
      for (const m of live) {
        const id = String(m.id);
        const was = prev[id] ?? cur[id]; // first sighting never fires
        if (cur[id] > was) {
          atomicWrite(goalFile, goalText(m));
          atomicWrite(goalTsFile, String(now));
          break;
        }
      }
      atomicWrite(stateFile, JSON.stringify(cur));
    },
    armGoal(match, now = Date.now()) {
      // Directly fire a celebration (used by `claudial --mock-goal` for demos).
      atomicWrite(goalFile, goalText(match));
      atomicWrite(goalTsFile, String(now));
    },
    activeGoalLine(now = Date.now()) {
      if (!existsSync(goalTsFile) || !existsSync(goalFile)) return null;
      const ts = Number(readFileSync(goalTsFile, 'utf8'));
      if (!Number.isFinite(ts) || now - ts > GOAL_WINDOW_MS) return null;
      return readFileSync(goalFile, 'utf8');
    },
  };
}
