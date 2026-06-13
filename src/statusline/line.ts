import type { Match } from '../types.js';
import { formatKickoff } from '../ui/UpcomingSection.js';

// Assumed wall-clock length of a match (kickoff → ~full time). ESPN exposes no
// end-time, so a finished match is anchored at kickoff + this for proximity math.
const MATCH_MS = 2 * 60 * 60 * 1000;

/** A live/halftime match: "⚽ QAT 0—1 SUI 67'" (em-dash U+2014 between scores). */
export function liveLine(match: Match): string {
  const clock =
    match.status === 'halftime' ? ' HT'
    : match.minute != null ? ` ${match.minute}'`
    : '';
  return `⚽ ${match.home.code} ${match.homeScore ?? 0}—${match.awayScore ?? 0} ${match.away.code}${clock}`;
}

/** A finished match with its result: "⚽ QAT 2—1 SUI FT". */
export function finishedLine(match: Match): string {
  return `⚽ ${match.home.code} ${match.homeScore ?? 0}—${match.awayScore ?? 0} ${match.away.code} FT`;
}

/** The next kickoff: "○ BRA—MOR Sun 01:00". */
function upcomingLine(match: Match, now: number): string {
  return `○ ${match.home.code}—${match.away.code} ${formatKickoff(match.startTimestamp, now)}`;
}

/**
 * Live matches joined by two spaces. Otherwise show whichever moment is closer
 * to `now`: the latest finished result (end ≈ kickoff + MATCH_MS) or the next
 * kickoff. Only one present → that one; neither → "".
 */
export function scoreLine(live: Match[], recent: Match[], upcoming: Match[], now: number = Date.now()): string {
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
      : upcomingLine(next, now);
  }
  if (lastFinished) return finishedLine(lastFinished);
  if (next) return upcomingLine(next, now);
  return '';
}
