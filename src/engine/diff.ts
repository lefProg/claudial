import type { Match, MatchIncident } from '../types.js';

export interface ScoreChange {
  matchId: number;
  side: 'home' | 'away';
  homeScore: number;
  awayScore: number;
}

const total = (m: Match) => (m.homeScore ?? 0) + (m.awayScore ?? 0);

export function diffGoals(prev: Match[], next: Match[]): ScoreChange[] {
  // duplicate ids in a snapshot should be impossible, but if they happen,
  // keep the highest-scoring entry as baseline — we'd rather miss a goal
  // than celebrate a phantom one
  const before = new Map<number, Match>();
  for (const p of prev) {
    const existing = before.get(p.id);
    if (!existing || total(p) > total(existing)) before.set(p.id, p);
  }
  const changes: ScoreChange[] = [];
  for (const m of next) {
    const p = before.get(m.id);
    if (!p) continue;
    // == null also passes NaN through, but NaN comparisons are all false,
    // so corrupted scores suppress events (fail toward false negative)
    if (m.homeScore == null || m.awayScore == null || p.homeScore == null || p.awayScore == null) continue;
    if (m.homeScore > p.homeScore) changes.push({ matchId: m.id, side: 'home', homeScore: m.homeScore, awayScore: m.awayScore });
    if (m.awayScore > p.awayScore) changes.push({ matchId: m.id, side: 'away', homeScore: m.homeScore, awayScore: m.awayScore });
  }
  return changes;
}

/** Returns incidents not yet in `seen`, adding them to it. */
export function diffIncidents(seen: Set<string>, incidents: MatchIncident[]): MatchIncident[] {
  const fresh: MatchIncident[] = [];
  for (const i of incidents) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    fresh.push(i);
  }
  return fresh;
}
