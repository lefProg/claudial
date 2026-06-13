import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeCache, TTL_MS, GOAL_WINDOW_MS } from '../src/statusline/cache.js';
import type { Match } from '../src/types.js';

function live(over: Partial<Match>): Match {
  return {
    id: 1, group: null,
    home: { name: 'Argentina', code: 'ARG' }, away: { name: 'Mexico', code: 'MEX' },
    homeScore: 1, awayScore: 0, status: 'live', statusText: '1st half',
    minute: 23, startTimestamp: 1, varInProgress: false, ...over,
  };
}

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claudial-test-')); });

describe('read/write', () => {
  it('returns null before anything is written', () => {
    expect(makeCache(dir).read(1000)).toBeNull();
  });
  it('round-trips a line and reports age', () => {
    const c = makeCache(dir);
    c.write('hello', 1000);
    const got = c.read(1500);
    expect(got?.line).toBe('hello');
    expect(got?.ageMs).toBe(500);
  });
});

describe('lock', () => {
  it('is exclusive until released', () => {
    const c = makeCache(dir);
    expect(c.tryLock(1000)).toBe(true);
    expect(c.tryLock(1000)).toBe(false);
    c.unlock();
    expect(c.tryLock(1000)).toBe(true);
  });
  it('reclaims a stale lock', () => {
    const c = makeCache(dir);
    expect(c.tryLock(1000)).toBe(true);
    expect(c.tryLock(1000 + 60_000)).toBe(true);
  });
});

describe('goal window', () => {
  it('does not fire on first sighting', () => {
    const c = makeCache(dir);
    c.updateGoalState([live({ homeScore: 1, awayScore: 0 })], 1000);
    expect(c.activeGoalLine(1000)).toBeNull();
  });
  it('fires when a score increases and expires after the window', () => {
    const c = makeCache(dir);
    c.updateGoalState([live({ homeScore: 0, awayScore: 0 })], 1000);
    c.updateGoalState([live({ homeScore: 1, awayScore: 0 })], 2000);
    const fired = c.activeGoalLine(2000);
    expect(fired).toContain('G O O O L');
    expect(fired).toContain('ARG 🇦🇷 1—0 🇲🇽 MEX');
    expect(c.activeGoalLine(2000 + GOAL_WINDOW_MS + 1)).toBeNull();
  });
  it('wraps the celebration in a real ANSI escape (ESC byte present)', () => {
    const c = makeCache(dir);
    c.updateGoalState([live({ homeScore: 0, awayScore: 0 })], 1000);
    c.updateGoalState([live({ homeScore: 1, awayScore: 0 })], 2000);
    const fired = c.activeGoalLine(2000)!;
    expect(fired.startsWith('\x1b[1;38;2;217;119;87m')).toBe(true);
    expect(fired.endsWith('\x1b[0m')).toBe(true);
  });
});

describe('constants', () => {
  it('exports sane defaults', () => {
    expect(TTL_MS).toBe(10_000);
    expect(GOAL_WINDOW_MS).toBe(15_000);
  });
});
