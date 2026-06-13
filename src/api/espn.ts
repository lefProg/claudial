import { parseEvent, parseIncidents } from './parse.js';
import type { Match, MatchIncident } from '../types.js';

// ESPN's public soccer scoreboard for the FIFA World Cup (league fifa.world).
// Keyless, served openly to ESPN's own web/apps, facts-only. One call returns
// every match for a date (or date range) with goals and cards inline.
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`espn ${res.status} ${path}`);
  const text = await res.text();
  if (!text) throw new Error(`espn empty body ${path}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`espn: malformed JSON from ${path}: ${text.slice(0, 120)}`);
  }
}

function yyyymmdd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Brief cache so one live tick (live + per-match incidents) is a single fetch.
const cache = new Map<string, { at: number; events: any[] }>();
const CACHE_MS = 5_000;

async function scoreboard(dates: string): Promise<any[]> {
  const hit = cache.get(dates);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.events;
  const data = await get(`/scoreboard?dates=${dates}`);
  const events = data.events ?? [];
  cache.set(dates, { at: Date.now(), events });
  return events;
}

function todayRange(daysAhead: number): string {
  const now = new Date();
  const start = yyyymmdd(now);
  if (daysAhead <= 0) return start;
  const end = new Date(now.getTime() + daysAhead * 86_400_000);
  return `${start}-${yyyymmdd(end)}`;
}

// Past date range "YYYYMMDD-YYYYMMDD" from (today - daysBack) through today (UTC).
export function pastRange(daysBack: number, now: number = Date.now()): string {
  const end = new Date(now);
  const start = new Date(now - daysBack * 86_400_000);
  return `${yyyymmdd(start)}-${yyyymmdd(end)}`;
}

// Kept for call-site compatibility; ESPN needs no season id to query.
export async function resolveSeasonId(): Promise<number> {
  return 2026;
}

export async function fetchLive(): Promise<Match[]> {
  const events = await scoreboard(todayRange(0));
  return events.map(parseEvent).filter((m) => m.status === 'live' || m.status === 'halftime');
}

export async function fetchUpcoming(_seasonId: number): Promise<Match[]> {
  const events = await scoreboard(todayRange(10));
  return events
    .map(parseEvent)
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => a.startTimestamp - b.startTimestamp);
}

export async function fetchRecent(_seasonId: number): Promise<Match[]> {
  const events = await scoreboard(pastRange(1));
  return events
    .map(parseEvent)
    .filter((m) => m.status === 'finished')
    .sort((a, b) => a.startTimestamp - b.startTimestamp);
}

export async function fetchIncidents(eventId: number): Promise<MatchIncident[]> {
  const events = await scoreboard(todayRange(0));
  const event = events.find((e: any) => Number(e.id) === eventId);
  return event ? parseIncidents(event) : [];
}
