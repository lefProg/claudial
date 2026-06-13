import { execFileSync } from 'node:child_process';
import { fetchLive as realFetchLive, fetchRecent as realFetchRecent, fetchUpcoming as realFetchUpcoming } from '../api/espn.js';
import { scoreLine } from './line.js';
import { makeCache, TTL_MS, type StatuslineCache } from './cache.js';
import type { Match } from '../types.js';

export interface RunDeps {
  fetchLive: () => Promise<Match[]>;
  fetchRecent: () => Promise<Match[]>;
  fetchUpcoming: (seasonId: number) => Promise<Match[]>;
  cache: StatuslineCache;
  branchOf: (input: string) => string | null;
  timeoutMs: number;
}

const PLACEHOLDER = '⚽ claudial · warming up';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout>;
  const timer = new Promise<T>((_, reject) => {
    id = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([p, timer]).finally(() => clearTimeout(id));
}

export async function runStatusline(input: string, deps: RunDeps, now: number = Date.now()): Promise<string> {
  const { cache } = deps;
  const cached = cache.read(now);
  let line: string | null = cached?.line ?? null;

  const fresh = cached != null && cached.ageMs <= TTL_MS;
  if (!fresh && cache.tryLock(now)) {
    try {
      const [liveM, recentM, upcomingM] = await withTimeout(
        Promise.all([deps.fetchLive(), deps.fetchRecent(), deps.fetchUpcoming(2026)]),
        deps.timeoutMs,
      );
      const next = scoreLine(liveM, recentM, upcomingM, now);
      cache.updateGoalState(liveM, now);
      if (next) { cache.write(next, now); line = next; }
    } catch {
      // keep last good cache (line already set)
    } finally {
      cache.unlock();
    }
  }

  const score = cache.activeGoalLine(now) ?? line ?? PLACEHOLDER;
  const branch = deps.branchOf(input);
  return branch ? `${score} · ${branch}` : score;
}

/** Resolve the git branch of the workspace dir named in Claude Code's stdin JSON. */
export function defaultBranchOf(input: string): string | null {
  let dir = '';
  try {
    const j = JSON.parse(input || '{}');
    dir = j?.workspace?.current_dir || j?.cwd || '';
  } catch { /* no/!json stdin */ }
  if (!dir) return null;
  try {
    const out = execFileSync('git', ['-C', dir, 'branch', '--show-current'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out || null;
  } catch { return null; }
}

export function defaultDeps(): RunDeps {
  return {
    fetchLive: realFetchLive,
    fetchRecent: () => realFetchRecent(2026),
    fetchUpcoming: realFetchUpcoming,
    cache: makeCache(),
    branchOf: defaultBranchOf,
    timeoutMs: 3000,
  };
}
