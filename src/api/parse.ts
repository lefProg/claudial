import type { Match, MatchStatus, MatchIncident, IncidentKind } from '../types.js';

// claudial parses ESPN's public soccer scoreboard (league fifa.world).
// One scoreboard response carries every match for a date plus, inline, each
// match's goals and cards — so a single request powers scores, scorer lines,
// and goal/red-card takeovers. Substitutions and VAR live only in ESPN's heavy
// per-match summary endpoint and are intentionally not used here.

function toStatus(raw: any): MatchStatus {
  const t = raw?.status?.type;
  const state = t?.state;
  if (state === 'in') return t?.name === 'STATUS_HALFTIME' ? 'halftime' : 'live';
  if (state === 'post') return 'finished';
  return 'upcoming';
}

function competitor(raw: any, side: 'home' | 'away'): any {
  const comps = raw?.competitions?.[0]?.competitors ?? [];
  return comps.find((c: any) => c.homeAway === side) ?? {};
}

function teamOf(c: any): { name: string; code: string } {
  const t = c?.team ?? {};
  return {
    name: t.displayName ?? t.shortDisplayName ?? t.name ?? '?',
    code: t.abbreviation ?? t.shortDisplayName ?? '?',
  };
}

function scoreOf(c: any, status: MatchStatus): number | null {
  if (status === 'upcoming') return null;
  const n = Number(c?.score);
  return Number.isFinite(n) ? n : null;
}

/** "21'" -> 21, "90'+7'" -> 90, "HT"/"" -> null */
function minuteOf(raw: any, status: MatchStatus): number | null {
  if (status !== 'live') return null;
  const m = /(\d+)/.exec(raw?.status?.displayClock ?? '');
  return m ? Number(m[1]) : null;
}

export function parseEvent(raw: any): Match {
  const status = toStatus(raw);
  const home = competitor(raw, 'home');
  const away = competitor(raw, 'away');
  return {
    id: Number(raw.id),
    group: null, // ESPN's scoreboard does not expose the group letter
    home: teamOf(home),
    away: teamOf(away),
    homeScore: scoreOf(home, status),
    awayScore: scoreOf(away, status),
    status,
    statusText: raw?.status?.type?.shortDetail ?? raw?.status?.type?.description ?? '',
    minute: minuteOf(raw, status),
    startTimestamp: Math.floor(Date.parse(raw?.date ?? '') / 1000) || 0,
    varInProgress: false, // not surfaced by the scoreboard feed
  };
}

function kindOf(det: any): IncidentKind | null {
  if (det?.scoringPlay) return 'goal';
  if (det?.redCard) return 'redCard';
  if (det?.yellowCard) return 'yellowCard';
  return null; // substitutions / VAR are not in the scoreboard feed
}

function detailOf(det: any, kind: IncidentKind): string | null {
  if (kind !== 'goal') return null;
  if (det?.ownGoal) return 'Own goal';
  if (det?.penaltyKick) return 'Penalty';
  return null;
}

function minuteFromClock(det: any): number | null {
  const m = /(\d+)/.exec(det?.clock?.displayValue ?? '');
  return m ? Number(m[1]) : null;
}

export function parseIncidents(raw: any): MatchIncident[] {
  const homeTeamId = competitor(raw, 'home')?.team?.id;
  const details = raw?.competitions?.[0]?.details ?? [];
  const out: MatchIncident[] = [];
  for (const det of details) {
    const kind = kindOf(det);
    if (!kind) continue;
    const athlete = det?.athletesInvolved?.[0];
    out.push({
      // content-derived, stable across polls (the diff engine dedupes on it)
      id: `${raw.id}-${det?.type?.id ?? '?'}-${det?.clock?.value ?? '?'}-${athlete?.id ?? '?'}`,
      kind,
      minute: minuteFromClock(det),
      player: athlete?.displayName ?? null,
      playerShort: athlete?.shortName ?? athlete?.displayName ?? null,
      detail: detailOf(det, kind),
      isHome: det?.team?.id != null && det.team.id === homeTeamId,
      homeScore: null, // running score not provided per incident; unused downstream
      awayScore: null,
    });
  }
  // ESPN already lists details chronologically (earliest first)
  return out;
}
