import { fetchLive, fetchRecent, fetchUpcoming, followsNothing } from './api/backend.js';
import { formatKickoff } from './ui/UpcomingSection.js';
import { homeTag, awayTag } from './ui/flags.js';
import type { Match } from './types.js';

function line(m: Match): string {
  if (m.status === 'upcoming') return `o ${formatKickoff(m.startTimestamp).padEnd(13)} ${homeTag(m.home.code, m.home.national)} - ${awayTag(m.away.code, m.away.national)}`;
  const label = m.status === 'finished' ? 'FT' : m.status === 'halftime' ? 'HT' : `${m.minute ?? '?'}'`;
  return `* ${label.padEnd(4)} ${homeTag(m.home.code, m.home.national)} ${m.homeScore ?? '-'} - ${m.awayScore ?? '-'} ${awayTag(m.away.code, m.away.national)}`;
}

export async function printSnapshot(seasonId: number): Promise<void> {
  const [live, upcoming, recent] = await Promise.all([
    fetchLive(), fetchUpcoming(seasonId), fetchRecent(seasonId),
  ]);
  console.log('claudial - LIVE FOOTBALL');
  if (await followsNothing().catch(() => false)) console.log('You follow nothing yet. Run: claudial follow');
  const liveIds = new Set(live.map((m) => m.id));
  for (const m of [...live, ...recent.filter((r) => !liveIds.has(r.id))]) console.log(line(m));
  if (upcoming.length) console.log('UPCOMING');
  for (const m of upcoming.slice(0, 8)) console.log(line(m));
}
