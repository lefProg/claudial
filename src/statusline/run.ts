import { execFileSync } from 'node:child_process';
import { fetchLive as realFetchLive, fetchRecent as realFetchRecent, fetchUpcoming as realFetchUpcoming, fetchLiveRedCards as realFetchLiveRedCards, type RedCardEvent } from '../api/backend.js';
import { scoreLine } from './line.js';
import { followsNothing } from '../api/backend.js';
import { makeCache, TTL_MS, type StatuslineCache } from './cache.js';
import { goalKickFrame } from './anim.js';
import type { Match } from '../types.js';
import type { Prediction } from '../predictions/types.js';
import { fetchPredictions as realFetchPredictions } from '../predictions/client.js';

export interface RunDeps {
  fetchLive: () => Promise<Match[]>;
  fetchRecent: () => Promise<Match[]>;
  fetchUpcoming: (seasonId: number) => Promise<Match[]>;
  fetchRedCards: () => Promise<RedCardEvent[]>;
  fetchPredictions: () => Promise<Prediction[]>;
  cache: StatuslineCache;
  branchOf: (input: string) => string | null;
  /** Whether this device follows nothing yet; injected so tests never touch the network. */
  followsNothing: () => Promise<boolean>;
  timeoutMs: number;
}

const PLACEHOLDER = '⚽ claudial · warming up';
/** Shown until the user follows something: a new device starts with nothing. */
export const FOLLOW_HINT = '⚽ claudial · run `claudial follow` to pick your teams';
/** Following something, but nothing is scheduled for it yet (e.g. an international break). */
export const NO_MATCHES = '⚽ claudial · no upcoming matches for your teams yet';
/** The server has not answered for a while (or ever, on this machine). */
export const OFFLINE = "⚽ claudial · can't reach the server, retrying";
/** How long a failing server may keep showing the last good line before OFFLINE replaces it. */
export const OFFLINE_AFTER_MS = 120_000;

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
      const [liveM, recentM, upcomingM, redsM, predsM] = await withTimeout(
        Promise.all([deps.fetchLive(), deps.fetchRecent(), deps.fetchUpcoming(2026), deps.fetchRedCards(), deps.fetchPredictions()]),
        deps.timeoutMs,
      );
      let next = scoreLine(liveM, recentM, upcomingM, now, predsM);
      // Nothing to show: say why, so the bar never looks stuck.
      if (!next) next = (await withTimeout(deps.followsNothing(), deps.timeoutMs)) ? FOLLOW_HINT : NO_MATCHES;
      cache.updateGoalState(liveM, now);
      cache.updateRedCards(redsM, now);
      cache.write(next, now);
      line = next;
    } catch {
      // Keep the last good line through a short outage; after that, say so.
      if (!line || (cached && cached.ageMs > OFFLINE_AFTER_MS)) {
        line = OFFLINE;
        cache.write(OFFLINE, now);
      }
    } finally {
      cache.unlock();
    }
  }

  const goal = cache.activeGoalLine(now);
  const red = cache.activeRedCardLine(now);
  // Goal → animated kick; red card → static flash; otherwise the idle/live line.
  const score = goal ? `${goalKickFrame(now)}  ${goal}` : (red ?? line ?? PLACEHOLDER);
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
    fetchRedCards: realFetchLiveRedCards,
    fetchPredictions: () => realFetchPredictions(),
    cache: makeCache(),
    branchOf: defaultBranchOf,
    followsNothing,
    timeoutMs: 3000,
  };
}
