import type { Match } from '../types.js';
import { formatKickoff } from '../ui/UpcomingSection.js';
import { homeTag, awayTag } from '../ui/flags.js';
import type { Prediction } from '../predictions/types.js';
import { matchPrediction } from '../predictions/match.js';
import { headline } from '../predictions/format.js';

// Assumed wall-clock length of a match (kickoff → ~full time). ESPN exposes no
// end-time, so a finished match is anchored at kickoff + this for proximity math.
const MATCH_MS = 2 * 60 * 60 * 1000;

/** A live/halftime match: "⚽ QAT 🇶🇦 0—1 🇨🇭 SUI 67'" (mirrored code+flag). */
export function liveLine(match: Match): string {
  const clock =
    match.status === 'halftime' ? ' HT'
    : match.minute != null ? ` ${match.minute}'`
    : '';
  return `⚽ ${homeTag(match.home.code)} ${match.homeScore ?? 0}—${match.awayScore ?? 0} ${awayTag(match.away.code)}${clock}`;
}

/** A finished match with its result: "⚽ QAT 🇶🇦 2—1 🇨🇭 SUI FT". */
export function finishedLine(match: Match): string {
  return `⚽ ${homeTag(match.home.code)} ${match.homeScore ?? 0}—${match.awayScore ?? 0} ${awayTag(match.away.code)} FT`;
}

/**
 * The next kickoff: "○ BRA 🇧🇷 — 🇲🇦 MAR Sun 01:00", with a prediction headline
 * appended when one is available: "… · 🔮 BRA win 64% · 2-1".
 */
function upcomingLine(match: Match, now: number, preds: Prediction[]): string {
  const base = `○ ${homeTag(match.home.code)} — ${awayTag(match.away.code)} ${formatKickoff(match.startTimestamp, now)}`;
  const pred = matchPrediction(match, preds);
  return pred ? `${base} · ${headline(pred)}` : base;
}

/**
 * Live matches joined by two spaces. Otherwise show whichever moment is closer
 * to `now`: the latest finished result (end ≈ kickoff + MATCH_MS) or the next
 * kickoff. Only one present → that one; neither → "". When the chosen line is
 * the next kickoff, a matching prediction headline is appended (`preds` is
 * empty unless the predictions engine is enabled, so default behavior is
 * unchanged).
 */
export function scoreLine(
  live: Match[],
  recent: Match[],
  upcoming: Match[],
  now: number = Date.now(),
  preds: Prediction[] = [],
): string {
  if (live.length > 0) return live.map(liveLine).join('  ');

  const lastFinished = recent.length
    ? recent.reduce((a, b) => (b.startTimestamp > a.startTimestamp ? b : a))
    : null;
  const next = upcoming[0] ?? null;

  if (lastFinished && next) {
    const finishMs = lastFinished.startTimestamp * 1000 + MATCH_MS;
    const startMs = next.startTimestamp * 1000;
    return Math.abs(now - finishMs) <= Math.abs(startMs - now)
      ? finishedLine(lastFinished)
      : upcomingLine(next, now, preds);
  }
  if (lastFinished) return finishedLine(lastFinished);
  if (next) return upcomingLine(next, now, preds);
  return '';
}
