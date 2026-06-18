import type { Match } from '../types.js';
import type { Prediction } from './types.js';

/**
 * Find the prediction for a claudial `Match`, matching on FIFA codes. Two teams
 * can meet more than once (group + knockout), so when several candidates share
 * the same code pair we take the one whose kickoff is closest to the match's.
 * Returns null when there's no prediction (engine disabled, API down, or the
 * fixture simply isn't predicted yet).
 */
export function matchPrediction(m: Match, preds: Prediction[]): Prediction | null {
  const candidates = preds.filter(
    (p) => p.home_code === m.home.code && p.away_code === m.away.code,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.reduce((best, p) =>
    Math.abs(p.kickoff_ts - m.startTimestamp) < Math.abs(best.kickoff_ts - m.startTimestamp)
      ? p
      : best,
  );
}
