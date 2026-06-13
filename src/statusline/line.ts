import type { Match } from '../types.js';
import { formatKickoff } from '../ui/UpcomingSection.js';

/** One live/halftime match: "⚽ QAT 0—1 SUI 67'" (em-dash U+2014 between scores). */
export function liveLine(match: Match): string {
  const clock =
    match.status === 'halftime' ? ' HT'
    : match.minute != null ? ` ${match.minute}'`
    : '';
  return `⚽ ${match.home.code} ${match.homeScore ?? 0}—${match.awayScore ?? 0} ${match.away.code}${clock}`;
}

/** Live matches joined by two spaces, else the next kickoff, else "". */
export function scoreLine(live: Match[], upcoming: Match[], now: number = Date.now()): string {
  if (live.length > 0) return live.map(liveLine).join('  ');
  const next = upcoming[0];
  if (next) return `○ ${next.home.code}—${next.away.code} ${formatKickoff(next.startTimestamp, now)}`;
  return '';
}
