import type { Match } from '../types.js';

const DAY_MS = 86_400_000;

/** Local-midnight epoch (ms) for the instant `ms`. */
function dayKey(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export interface DayBuckets {
  yesterday: Match[];
  today: Match[];
  future: Match[];
}

/**
 * Partition matches by local calendar day relative to `now`:
 * today (diff 0), yesterday (diff -1), future (diff ≥ 1). Anything older than
 * yesterday — or with no usable timestamp — is dropped. Each bucket is sorted
 * ascending by kickoff. `Match.startTimestamp` is unix seconds.
 */
export function partitionByDay(matches: Match[], now: number = Date.now()): DayBuckets {
  const todayKey = dayKey(now);
  const out: DayBuckets = { yesterday: [], today: [], future: [] };
  for (const m of matches) {
    if (!m.startTimestamp) continue;
    const diffDays = Math.round((dayKey(m.startTimestamp * 1000) - todayKey) / DAY_MS);
    if (diffDays === 0) out.today.push(m);
    else if (diffDays === -1) out.yesterday.push(m);
    else if (diffDays >= 1) out.future.push(m);
  }
  const byStart = (a: Match, b: Match) => a.startTimestamp - b.startTimestamp;
  out.yesterday.sort(byStart);
  out.today.sort(byStart);
  out.future.sort(byStart);
  return out;
}
