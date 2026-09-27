/** Why the board has nothing to show, if it has nothing to show. Pure, for tests. */
export type BoardNotice = 'offline' | 'follow-nothing' | 'no-matches' | null;

export function boardNotice(s: {
  followsNone: boolean; stale: boolean; lastUpdated: number | null; matchCount: number;
}): BoardNotice {
  if (s.stale && s.lastUpdated == null) return 'offline'; // never reached the server
  if (s.followsNone) return 'follow-nothing';
  if (s.lastUpdated != null && s.matchCount === 0) return 'no-matches';
  return null;
}
