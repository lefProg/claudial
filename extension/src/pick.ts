import type { LeagueInfo, Settings, TeamInfo } from '../../src/api/backend.js';

// Rows for the "what do you follow?" quick pick: every league, then every team
// once (a league whose list failed to load is null and skipped).

export type PickItem = { label: string; description: string; picked: boolean; kind: 'league' | 'team'; id: string };

export function pickItems(leagues: LeagueInfo[], teams: Record<string, TeamInfo[] | null>, s: Settings): PickItem[] {
  const out: PickItem[] = leagues.map((l) => ({ label: l.name, description: 'whole league', picked: s.leagues.includes(l.slug), kind: 'league', id: l.slug }));
  const seen = new Set<string>();
  for (const l of leagues) {
    for (const t of teams[l.slug] ?? []) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push({ label: t.name, description: l.name, picked: s.teams.includes(t.id), kind: 'team', id: t.id });
    }
  }
  return out;
}

/**
 * Settings from the ticked rows. Anything followed `before` that had no row at all
 * (its league's list failed to load) is kept: the user never saw it, so saving
 * must not unfollow it.
 */
export function settingsFrom(chosen: PickItem[], shown: PickItem[] = [], before: Settings = { leagues: [], teams: [] }): Settings {
  const had = (kind: PickItem['kind']) => new Set(shown.filter((i) => i.kind === kind).map((i) => i.id));
  const shownLeagues = had('league');
  const shownTeams = had('team');
  return {
    leagues: [...chosen.filter((i) => i.kind === 'league').map((i) => i.id), ...before.leagues.filter((id) => !shownLeagues.has(id))],
    teams: [...chosen.filter((i) => i.kind === 'team').map((i) => i.id), ...before.teams.filter((id) => !shownTeams.has(id))],
  };
}
