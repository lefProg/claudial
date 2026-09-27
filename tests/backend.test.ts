import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  toMatch, toIncidents, fetchState, invalidateState, fetchLive, fetchRecent, fetchUpcoming,
  fetchLiveRedCards, api, ApiError, subscribeEvents, followsNothing, type ServerMatch,
} from '../src/api/backend.js';
import { deviceId } from '../src/api/device.js';

// Every test gets its own config dir and a fake server: nothing touches ~/.config or the network.
beforeEach(() => {
  process.env.XDG_CONFIG_HOME = mkdtempSync(join(tmpdir(), 'claudial-cfg-'));
  process.env.CLAUDIAL_API_URL = 'http://fake.test';
  invalidateState();
});
afterEach(() => { vi.unstubAllGlobals(); });

function sm(over: Partial<ServerMatch> = {}): ServerMatch {
  return {
    id: '760416', league: 'gre.1',
    home: { id: '443', name: 'Panathinaikos', code: 'PAO' }, away: { id: '11431', name: 'Panetolikos', code: 'PAN' },
    homeScore: 1, awayScore: 0, status: 'live', statusText: "67'", minute: 67, startTimestamp: 1_790_000_000,
    incidents: [{ id: 'i1', kind: 'redCard', minute: 60, player: 'Some One', playerShort: 'S. One', detail: null, isHome: false }],
    ...over,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('toMatch', () => {
  it('turns the string id into a number and marks clubs as non-national', () => {
    const m = toMatch(sm());
    expect(m.id).toBe(760416);
    expect(m.home.national).toBe(false);
    expect(m.group).toBeNull();
    expect(toMatch(sm({ league: 'fifa.world' })).home.national).toBe(true);
  });

  it('shows a postponed match as finished with its own label and no score', () => {
    const m = toMatch(sm({ status: 'postponed', statusText: '', homeScore: null, awayScore: null }));
    expect(m.status).toBe('finished');
    expect(m.statusText).toBe('Postponed');
    expect(m.homeScore).toBeNull();
  });

  it('keeps incidents and adds the running-score fields the client type has', () => {
    const inc = toIncidents(sm())[0]!;
    expect(inc).toMatchObject({ id: 'i1', kind: 'redCard', homeScore: null, awayScore: null });
  });
});

describe('fetchState and the split functions', () => {
  it('serves every caller in a tick from one request', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      return jsonResponse({ generatedAt: 1, matches: [
        sm(), sm({ id: '2', status: 'finished' }), sm({ id: '3', status: 'upcoming', startTimestamp: 1_790_100_000 }),
      ] });
    });
    const [live, recent, upcoming, reds] = await Promise.all([fetchLive(), fetchRecent(2026), fetchUpcoming(2026), fetchLiveRedCards()]);
    expect(calls).toBe(1);
    expect(live.map((m) => m.id)).toEqual([760416]);
    expect(recent.map((m) => m.id)).toEqual([2]);
    expect(upcoming.map((m) => m.id)).toEqual([3]);
    expect(reds).toEqual([{ id: 'i1', homeCode: 'PAO', awayCode: 'PAN', player: 'S. One', minute: 60, national: false }]);
  });

  it('does not cache a failure', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => { calls++; return calls === 1 ? jsonResponse({ error: 'x' }, 503) : jsonResponse({ generatedAt: 1, matches: [] }); });
    await expect(fetchState()).rejects.toBeInstanceOf(ApiError);
    await expect(fetchState()).resolves.toEqual({ generatedAt: 1, matches: [] });
  });
});

describe('api', () => {
  it('sends this device id as the bearer token and surfaces the server error message', async () => {
    let auth = '';
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      auth = (init.headers as Record<string, string>).Authorization;
      return jsonResponse({ error: 'unknown league; GET /v1/leagues lists the valid slugs' }, 400);
    }) as unknown as typeof fetch;
    const err = await api('PUT', '/v1/me/settings', { leagues: ['x'] }, fetchImpl).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.message).toContain('unknown league');
    expect(auth).toBe(`Bearer ${deviceId(join(process.env.XDG_CONFIG_HOME!, 'claudial'))}`);
  });
});

describe('followsNothing', () => {
  it('is true for a new device and never follows anything by itself', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      seen.push(`${init.method ?? 'GET'} ${new URL(url).pathname}`);
      return jsonResponse({ leagues: [], teams: [] });
    });
    expect(await followsNothing()).toBe(true);
    expect(seen).toEqual(['GET /v1/me/settings']);
  });

  it('is false once a league or a team is followed', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse({ leagues: [], teams: ['443'] }));
    expect(await followsNothing()).toBe(false);
  });
});

describe('subscribeEvents', () => {
  it('reports each named event and ignores heartbeats', async () => {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(enc.encode(': heartbeat\n\nevent: go'));
        c.enqueue(enc.encode('al\ndata: {"match":{}}\n\nevent: card\ndata: {}\n\n'));
      },
    });
    const fetchImpl = (async () => new Response(body, { status: 200 })) as unknown as typeof fetch;
    const names: string[] = [];
    const stop = subscribeEvents((n) => names.push(n), fetchImpl);
    await vi.waitFor(() => expect(names).toEqual(['goal', 'card']));
    stop();
  });
});

describe('subscribeEvents stall detection', () => {
  it('reconnects when the stream goes silent', async () => {
    let opens = 0;
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      opens++;
      // A stream that sends nothing and never ends, until aborted.
      const body = new ReadableStream<Uint8Array>({
        start(c) { init.signal?.addEventListener('abort', () => c.error(new Error('aborted'))); },
      });
      return new Response(body, { status: 200 });
    }) as unknown as typeof fetch;
    const stop = subscribeEvents(() => {}, fetchImpl, 50);
    await vi.waitFor(() => expect(opens).toBeGreaterThanOrEqual(2), { timeout: 3000 });
    stop();
  });
});

describe('deviceId', () => {
  it('creates one private id and keeps it', () => {
    const dir = join(process.env.XDG_CONFIG_HOME!, 'claudial');
    const a = deviceId(dir);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(deviceId(dir)).toBe(a);
    expect(statSync(join(dir, 'device-id')).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(dir, 'device-id'), 'utf8').trim()).toBe(a);
  });
});
