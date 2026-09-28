import { fetchLive, fetchRecent, fetchUpcoming, followsNothing } from './api/backend.js';
import { kickoffColumn, kickoffWidth } from './ui/kickoff.js';
import { homeName, awayName } from './ui/flags.js';
import type { Match } from './types.js';

function line(m: Match, width = 22): string {
  if (m.status === 'upcoming') return `o ${kickoffColumn(m.startTimestamp, Date.now(), width)}${homeName(m.home)} - ${awayName(m.away)}`;
  const label = m.status === 'finished' ? 'FT' : m.status === 'halftime' ? 'HT' : `${m.minute ?? '?'}'`;
  return `* ${label.padEnd(4)} ${homeName(m.home)} ${m.homeScore ?? '-'} - ${m.awayScore ?? '-'} ${awayName(m.away)}`;
}

export async function printSnapshot(seasonId: number): Promise<void> {
  const [live, upcoming, recent] = await Promise.all([
    fetchLive(), fetchUpcoming(seasonId), fetchRecent(seasonId),
  ]);
  console.log('claudial - LIVE FOOTBALL');
  if (await followsNothing().catch(() => false)) console.log('You follow nothing yet. Run: claudial follow');
  else if (live.length + upcoming.length + recent.length === 0) console.log('No upcoming matches for what you follow yet.');
  const liveIds = new Set(live.map((m) => m.id));
  for (const m of [...live, ...recent.filter((r) => !liveIds.has(r.id))]) console.log(line(m));
  if (upcoming.length) console.log('UPCOMING');
  const next = upcoming.slice(0, 8);
  const width = kickoffWidth(next.map((m) => m.startTimestamp));
  for (const m of next) console.log(line(m, width));
}
