import { configDir, deviceId } from './device.js';
import type { Match, MatchIncident, MatchStatus } from '../types.js';

// The only way this client gets football data: the claudial server's /v1 API.
// It exports the same functions the ESPN layer used to, so the dashboard,
// statusline and snapshot did not change. The server's JSON shape is adapted
// here (string ids, embedded incidents, postponed matches, club teams).

export interface RedCardEvent {
  id: string; // stable per incident — used to fire each red once
  homeCode: string;
  awayCode: string;
  player: string;
  minute: number | null;
  national: boolean; // national teams get flags in the red-card flash
}

// Where the server lives: the deployed VPS. Plain HTTP until it has a domain and
// TLS; scripts/check-release.mjs blocks an npm publish until this is https://.
// CLAUDIAL_API_URL always wins (local dev: http://localhost:8080).
export const DEFAULT_API_URL = 'http://161.97.67.12:30083';
export function apiUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.CLAUDIAL_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
}

// ── Server shapes (docs/API.md in claudial-backend) ─────────────────────────
interface ServerTeam { id: string; name: string; code: string }
interface ServerIncident {
  id: string; kind: MatchIncident['kind']; minute: number | null;
  player: string | null; playerShort: string | null; detail: string | null; isHome: boolean;
}
export interface ServerMatch {
  id: string; league: string; home: ServerTeam; away: ServerTeam;
  homeScore: number | null; awayScore: number | null;
  status: MatchStatus | 'postponed'; statusText: string; minute: number | null;
  startTimestamp: number; incidents: ServerIncident[];
}
export interface ServerState { generatedAt: number; matches: ServerMatch[] }
export interface Settings { leagues: string[]; teams: string[] }
export interface LeagueInfo { slug: string; name: string }
export interface TeamInfo { id: string; name: string; code: string }

/** Thrown for any non-2xx answer, carrying the server's own error message. */
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const TIMEOUT_MS = 8_000;

export async function api<T>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(`${apiUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${deviceId()}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `server answered ${res.status}`;
    try { message = (JSON.parse(text) as { error?: string }).error ?? message; } catch { /* not JSON */ }
    throw new ApiError(res.status, message);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Adapting server matches to the client's Match ───────────────────────────
export function toMatch(m: ServerMatch): Match {
  const national = m.league === 'fifa.world';
  const status: MatchStatus = m.status === 'postponed' ? 'finished' : m.status;
  return {
    id: Number(m.id),
    group: null,
    home: { name: m.home.name, code: m.home.code, national },
    away: { name: m.away.name, code: m.away.code, national },
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status,
    statusText: m.status === 'postponed' ? (m.statusText || 'Postponed') : m.statusText,
    minute: m.minute,
    startTimestamp: m.startTimestamp,
    varInProgress: false,
  };
}

export function toIncidents(m: ServerMatch): MatchIncident[] {
  return m.incidents.map((i) => ({ ...i, homeScore: null, awayScore: null }));
}

// One /v1/state request serves every caller in a tick (dashboard or statusline):
// the in-flight promise is shared, and the answer is reused for a few seconds.
const CACHE_MS = 5_000;
let cached: { at: number; state: Promise<ServerState> } | null = null;

export function fetchState(now: number = Date.now()): Promise<ServerState> {
  if (MOCK) return Promise.resolve(mockState());
  if (cached && now - cached.at < CACHE_MS) return cached.state;
  const state = api<ServerState>('GET', '/v1/state');
  cached = { at: now, state };
  state.catch(() => { if (cached?.state === state) cached = null; });
  return state;
}

/** Forget the cached state (after the event stream says something changed). */
export function invalidateState(): void { cached = null; }

const isLive = (m: Match) => m.status === 'live' || m.status === 'halftime';

// Kept for call-site compatibility; the server needs no season id.
export async function resolveSeasonId(): Promise<number> {
  return 2026;
}

export async function fetchLive(): Promise<Match[]> {
  if (MOCK) mockLiveCalls++;
  return (await fetchState()).matches.map(toMatch).filter(isLive);
}

export async function fetchUpcoming(_seasonId: number): Promise<Match[]> {
  return (await fetchState()).matches
    .map(toMatch)
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => a.startTimestamp - b.startTimestamp);
}

export async function fetchRecent(_seasonId: number): Promise<Match[]> {
  return (await fetchState()).matches
    .map(toMatch)
    .filter((m) => m.status === 'finished')
    .sort((a, b) => a.startTimestamp - b.startTimestamp);
}

export async function fetchIncidents(eventId: number): Promise<MatchIncident[]> {
  const m = (await fetchState()).matches.find((x) => Number(x.id) === eventId);
  return m ? toIncidents(m) : [];
}

// Red cards in live matches, from the same /v1/state answer.
export async function fetchLiveRedCards(): Promise<RedCardEvent[]> {
  const out: RedCardEvent[] = [];
  for (const sm of (await fetchState()).matches) {
    const m = toMatch(sm);
    if (!isLive(m)) continue;
    for (const inc of sm.incidents) {
      if (inc.kind === 'redCard') {
        out.push({ id: inc.id, homeCode: m.home.code, awayCode: m.away.code, player: inc.playerShort ?? inc.player ?? '?', minute: inc.minute, national: m.home.national !== false });
      }
    }
  }
  return out;
}

// ── Subscriptions ────────────────────────────────────────────────────────────
export const listLeagues = () => api<LeagueInfo[]>('GET', '/v1/leagues');
export const listTeams = (slug: string) => api<TeamInfo[]>('GET', `/v1/leagues/${encodeURIComponent(slug)}/teams`);
export const getSettings = () => api<Settings>('GET', '/v1/me/settings');
export const putSettings = (s: Settings) => api<Settings>('PUT', '/v1/me/settings', s);
export const forgetDevice = () => api<void>('DELETE', '/v1/me/settings');

/**
 * A new device follows nothing until the user picks something. True when this
 * device follows no league and no team, so the UI can say how to start.
 */
export async function followsNothing(): Promise<boolean> {
  if (MOCK) return false;
  const s = await getSettings();
  return s.leagues.length === 0 && s.teams.length === 0;
}

// ── Push: the server's event stream ─────────────────────────────────────────
/** Three missed 15 s heartbeats. */
const STALL_MS = 45_000;
/**
 * Hold GET /v1/events open and call `onEvent` with each event name. Reconnects
 * with backoff after errors or when the server ends the stream. Returns a stop
 * function. The caller refetches /v1/state on each event.
 */
export function subscribeEvents(
  onEvent: (name: string) => void,
  fetchImpl: typeof fetch = fetch,
  stallMs: number = STALL_MS,
): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let failures = 0;

  const loop = async () => {
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await fetchImpl(`${apiUrl()}/v1/events`, {
          headers: { Authorization: `Bearer ${deviceId()}`, Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new ApiError(res.status, `events answered ${res.status}`);
        failures = 0;
        // The server writes a heartbeat every 15 s. Silence for longer than that
        // means a dead connection nobody closed (a sleeping laptop, a NAT drop):
        // abort and reconnect instead of waiting forever (final review N9).
        const current = controller;
        let stall = setTimeout(() => current.abort(), stallMs);
        const decoder = new TextDecoder();
        let buf = '';
        for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
          clearTimeout(stall);
          stall = setTimeout(() => current.abort(), stallMs);
          buf += decoder.decode(chunk, { stream: true });
          let cut: number;
          while ((cut = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, cut);
            buf = buf.slice(cut + 2);
            const name = frame.split('\n').find((l) => l.startsWith('event:'))?.slice(6).trim();
            if (name) onEvent(name);
          }
        }
        clearTimeout(stall);
      } catch { failures++; }
      if (stopped) return;
      const wait = Math.min(1_000 * 2 ** Math.min(failures, 6), 60_000);
      await new Promise((r) => setTimeout(r, wait));
    }
  };
  void loop();
  return () => { stopped = true; controller?.abort(); };
}

// ── Mock mode for demos (CLAUDIAL_MOCK) ──────────────────────────────────────
// A fake live Argentina–England match. The first live fetch is 1–1; from the
// second fetch on, Harry Kane has scored to make it 1–2 — so the next poll (or
// pressing `r`) fires the goal takeover with his name. Inert unless the env var
// is set. Run: `CLAUDIAL_MOCK=1 claudial`, then press `r`.
const MOCK = !!process.env.CLAUDIAL_MOCK;
let mockLiveCalls = 0;

function mockState(): ServerState {
  const scored = mockLiveCalls >= 2; // Kane's goal lands on the 2nd live fetch
  const goal = (id: string, minute: number, player: string, short: string, isHome: boolean): ServerIncident =>
    ({ id, kind: 'goal', minute, player, playerShort: short, detail: null, isHome });
  return {
    generatedAt: Math.floor(Date.now() / 1000),
    matches: [{
      id: '9001', league: 'fifa.world',
      home: { id: '202', name: 'Argentina', code: 'ARG' }, away: { id: '448', name: 'England', code: 'ENG' },
      homeScore: 1, awayScore: scored ? 2 : 1, status: 'live', statusText: scored ? "78'" : "76'",
      minute: scored ? 78 : 76, startTimestamp: Math.floor(Date.now() / 1000) - 78 * 60,
      incidents: [
        goal('9001-137-600-1', 10, 'Lionel Messi', 'L. Messi', true),
        goal('9001-137-2400-2', 40, 'Jude Bellingham', 'J. Bellingham', false),
        ...(scored ? [goal('9001-137-4680-3', 78, 'Harry Kane', 'H. Kane', false)] : []),
      ],
    }],
  };
}
