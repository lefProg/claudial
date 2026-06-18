import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Match } from '../src/types.js';
import type { Prediction } from '../src/predictions/types.js';
import { matchPrediction } from '../src/predictions/match.js';
import { headline, fullSlate } from '../src/predictions/format.js';
import { predictionsEnabled, predictionsUrl, fetchPredictions } from '../src/predictions/client.js';
import { scoreLine } from '../src/statusline/line.js';

function pred(over: Partial<Prediction> = {}): Prediction {
  return {
    home_code: 'SUI',
    away_code: 'QAT',
    kickoff_date: '2026-06-21',
    kickoff_ts: 1781990400,
    markets: {
      result: { home: 0.64, draw: 0.22, away: 0.14 },
      over_under_2_5: { over: 0.58, under: 0.42 },
      btts: { yes: 0.47, no: 0.53 },
      scoreline: '2-1',
    },
    pick: { market: 'result', selection: 'home', label: 'SUI win', confidence: 0.64 },
    suggested_stake_eur: 3,
    rationale: 'Home edge.',
    disclaimer: 'For entertainment. Bet responsibly — low stakes only.',
    ...over,
  };
}

function match(over: Partial<Match> = {}): Match {
  return {
    id: 1,
    group: 'Group B',
    home: { name: 'Switzerland', code: 'SUI' },
    away: { name: 'Qatar', code: 'QAT' },
    homeScore: null,
    awayScore: null,
    status: 'upcoming',
    statusText: 'Scheduled',
    minute: null,
    startTimestamp: 1781990400,
    varInProgress: false,
    ...over,
  };
}

describe('matchPrediction', () => {
  it('matches by FIFA code pair', () => {
    expect(matchPrediction(match(), [pred()])?.pick.label).toBe('SUI win');
  });

  it('returns null when no prediction matches', () => {
    expect(matchPrediction(match({ home: { name: 'Brazil', code: 'BRA' } }), [pred()])).toBeNull();
  });

  it('returns null on empty predictions', () => {
    expect(matchPrediction(match(), [])).toBeNull();
  });

  it('picks the nearest kickoff when a code pair repeats', () => {
    const near = pred({ kickoff_ts: 1781990400 + 3600 });
    const far = pred({ kickoff_ts: 1781990400 + 999999 });
    expect(matchPrediction(match(), [far, near])?.kickoff_ts).toBe(near.kickoff_ts);
  });
});

describe('format', () => {
  it('headline is compact', () => {
    expect(headline(pred())).toBe('🔮 SUI win 64% · 2-1');
  });

  it('fullSlate has a pick line and a markets line', () => {
    const lines = fullSlate(pred());
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('PICK: SUI win (64%)');
    expect(lines[0]).toContain('stake €3');
    expect(lines[1]).toContain('SUI 64%');
    expect(lines[1]).toContain('O2.5 58%');
    expect(lines[1]).toContain('score 2-1');
  });
});

describe('predictionsUrl', () => {
  it('uses the env var when set', () => {
    expect(predictionsUrl({ CLAUDIAL_PREDICTIONS_URL: 'http://custom/' })).toBe('http://custom/');
  });
  it('falls back to the shipped default URL', () => {
    expect(predictionsUrl({})).toMatch(/^https?:\/\//);
  });
});

describe('predictionsEnabled', () => {
  it('is on by default (shipped URL)', () => {
    expect(predictionsEnabled({})).toBe(true);
  });
  it('stays on with an env override', () => {
    expect(predictionsEnabled({ CLAUDIAL_PREDICTIONS_URL: 'http://x' })).toBe(true);
  });
});

describe('fetchPredictions', () => {
  it('fetches the shipped default URL when no env var is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    let calledUrl = '';
    const fetchImpl = (async (u: string) => { calledUrl = u; return new Response(JSON.stringify([pred()])); }) as unknown as typeof fetch;
    const out = await fetchPredictions({ env: {}, fetchImpl, dir });
    expect(out[0]?.pick.label).toBe('SUI win');
    expect(calledUrl).toMatch(/^https?:\/\//);
  });

  it('fetches, returns and caches when enabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    const env = { CLAUDIAL_PREDICTIONS_URL: 'http://x/api/predictions/' };
    let calls = 0;
    const fetchImpl = (async () => { calls++; return new Response(JSON.stringify([pred()])); }) as unknown as typeof fetch;
    const a = await fetchPredictions({ env, fetchImpl, dir });
    expect(a[0]?.pick.label).toBe('SUI win');
    // Second call within TTL is served from disk cache (no extra fetch).
    const b = await fetchPredictions({ env, fetchImpl, dir });
    expect(b[0]?.pick.label).toBe('SUI win');
    expect(calls).toBe(1);
  });

  it('fails silent on network error (API down)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    const env = { CLAUDIAL_PREDICTIONS_URL: 'http://x' };
    const fetchImpl = (async () => { throw new Error('boom'); }) as unknown as typeof fetch;
    expect(await fetchPredictions({ env, fetchImpl, dir })).toEqual([]);
  });

  it('fails silent on HTTP error status (500)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    const env = { CLAUDIAL_PREDICTIONS_URL: 'http://x' };
    const fetchImpl = (async () => new Response('oops', { status: 500 })) as unknown as typeof fetch;
    expect(await fetchPredictions({ env, fetchImpl, dir })).toEqual([]);
  });

  it('fails silent on garbage / non-array body', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    const env = { CLAUDIAL_PREDICTIONS_URL: 'http://x' };
    const fetchImpl = (async () => new Response('{"error":"nope"}')) as unknown as typeof fetch;
    expect(await fetchPredictions({ env, fetchImpl, dir })).toEqual([]);
  });

  it('aborts a hung API within the timeout and returns []', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'claudial-pred-'));
    const env = { CLAUDIAL_PREDICTIONS_URL: 'http://x' };
    // Reject when the abort signal fires, mimicking a hung request being cut off.
    const fetchImpl = ((_u: string, opts: { signal: AbortSignal }) =>
      new Promise((_res, rej) => {
        opts.signal.addEventListener('abort', () => rej(new Error('aborted')));
      })) as unknown as typeof fetch;
    expect(await fetchPredictions({ env, fetchImpl, dir, timeoutMs: 50 })).toEqual([]);
  });
});

describe('scoreLine with predictions', () => {
  const next = match({ id: 9 });

  it('appends the headline to the next-kickoff line', () => {
    const line = scoreLine([], [], [next], next.startTimestamp - 1000, [pred()]);
    expect(line).toContain('🔮 SUI win 64% · 2-1');
  });

  it('is unchanged when no predictions are supplied', () => {
    const withPreds = scoreLine([], [], [next], next.startTimestamp - 1000, []);
    expect(withPreds).not.toContain('🔮');
  });
});
