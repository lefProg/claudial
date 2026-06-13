import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runStatusline } from '../src/statusline/run.js';
import { makeCache } from '../src/statusline/cache.js';
import type { Match } from '../src/types.js';

function live(): Match {
  return {
    id: 1, group: null,
    home: { name: 'Qatar', code: 'QAT' }, away: { name: 'Switzerland', code: 'SUI' },
    homeScore: 0, awayScore: 1, status: 'live', statusText: '2nd half',
    minute: 67, startTimestamp: 1, varInProgress: false,
  };
}

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claudial-run-')); });

function deps(over = {}) {
  return {
    fetchLive: async () => [live()],
    fetchRecent: async () => [] as Match[],
    fetchUpcoming: async () => [] as Match[],
    fetchRedCards: async () => [],
    cache: makeCache(dir),
    branchOf: () => 'main',
    timeoutMs: 3000,
    ...over,
  };
}

describe('runStatusline', () => {
  it('does NOT animate the idle next-kickoff line', async () => {
    const up: Match = {
      id: 7, group: null,
      home: { name: 'Qatar', code: 'QAT' }, away: { name: 'Switzerland', code: 'SUI' },
      homeScore: null, awayScore: null, status: 'upcoming', statusText: '',
      minute: null, startTimestamp: 2_000_000_000, varInProgress: false,
    };
    const out = await runStatusline('{}', deps({
      fetchLive: async () => [] as Match[],
      fetchRecent: async () => [] as Match[],
      fetchUpcoming: async () => [up],
      branchOf: () => null,
    }), 0);
    expect(out).toContain('○');
    expect(out).not.toContain('🥅');
  });

  it('animates the goal-kick during a goal celebration', async () => {
    const c = makeCache(dir);
    c.armGoal({
      id: 1, group: null,
      home: { name: 'Argentina', code: 'ARG' }, away: { name: 'England', code: 'ENG' },
      homeScore: 1, awayScore: 2, status: 'live', statusText: '', minute: 78,
      startTimestamp: 0, varInProgress: false,
    }, 0);
    const out = await runStatusline('{}', deps({
      cache: c,
      fetchLive: async () => [] as Match[],
      fetchRecent: async () => [] as Match[],
      fetchUpcoming: async () => [] as Match[],
      branchOf: () => null,
    }), 0);
    expect(out).toContain('G O O O L');
    expect(out).toContain('🥅'); // frame 0 carries the net
  });

  it('shows a static red-card flash (no kick animation) when one is active', async () => {
    const c = makeCache(dir);
    c.armRedCard({ player: 'Demirović', homeCode: 'ARG', awayCode: 'ENG' }, 0);
    const out = await runStatusline('{}', deps({
      cache: c,
      fetchLive: async () => [] as Match[],
      fetchRecent: async () => [] as Match[],
      fetchUpcoming: async () => [] as Match[],
      fetchRedCards: async () => [],
      branchOf: () => null,
    }), 0);
    expect(out).toContain('R E D');
    expect(out).toContain('DEMIROVIĆ');
    expect(out).not.toContain('🥅');
  });
  it('fetches, caches and appends the branch', async () => {
    const out = await runStatusline('{}', deps(), 1000);
    expect(out).toBe("⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67' · main");
  });
  it('omits the separator when there is no branch', async () => {
    const out = await runStatusline('{}', deps({ branchOf: () => null }), 1000);
    expect(out).toBe("⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67'");
  });
  it('falls back to cache when the fetch throws', async () => {
    const c = makeCache(dir);
    c.write('⚽ OLD 0—0 CACHE', 1000);
    const out = await runStatusline('{}', deps({
      cache: c,
      fetchLive: async () => { throw new Error('network'); },
      branchOf: () => null,
    }), 1500);
    expect(out).toBe('⚽ OLD 0—0 CACHE');
  });
  it('shows a warming-up placeholder with no cache and a failing fetch', async () => {
    const out = await runStatusline('{}', deps({
      fetchLive: async () => { throw new Error('network'); },
      branchOf: () => null,
    }), 1000);
    expect(out).toBe('⚽ claudial · warming up');
  });
  it('shows the latest finished result when nothing is live and it is the closest moment', async () => {
    const HOUR = 3600;
    const now = 1_000_000_000_000; // fixed ms
    const nowS = Math.floor(now / 1000);
    const fin = {
      id: 9, group: null,
      home: { name: 'Italy', code: 'ITA' }, away: { name: 'Peru', code: 'PER' },
      homeScore: 3, awayScore: 0, status: 'finished' as const, statusText: 'FT',
      minute: null, startTimestamp: nowS - (2 * HOUR - 60), varInProgress: false,
    };
    const out = await runStatusline('{}', deps({
      fetchLive: async () => [] as Match[],
      fetchRecent: async () => [fin],
      fetchUpcoming: async () => [] as Match[],
      branchOf: () => null,
    }), now);
    expect(out).toBe('⚽ ITA 3—0 PER FT');
  });
});
