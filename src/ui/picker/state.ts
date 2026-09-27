import type { LeagueInfo, Settings, TeamInfo } from '../../api/backend.js';

// The follow picker's state, as a pure reducer so every key press is testable
// without a terminal. The component (Picker.tsx) only renders `rows()` and
// dispatches keys.

export type TeamList = TeamInfo[] | 'loading' | 'error';

export type Row =
  | { kind: 'league'; slug: string; name: string }
  | { kind: 'team'; id: string; name: string; code: string; league: string };

export type View = { kind: 'home' } | { kind: 'league'; slug: string };

export interface PickerState {
  leagues: LeagueInfo[];
  teams: Record<string, TeamList>;
  followLeagues: string[];
  followTeams: string[];
  view: View;
  query: string;
  cursor: number;
  dirty: boolean;
  finished: boolean;
}

export type PickerAction =
  | { type: 'loaded'; leagues: LeagueInfo[]; settings: Settings }
  | { type: 'teamsLoaded'; slug: string; teams: TeamList }
  | { type: 'type'; text: string }
  | { type: 'backspace' }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'pageUp'; by: number }
  | { type: 'pageDown'; by: number }
  | { type: 'toggle' }
  | { type: 'open' }
  | { type: 'back' }
  | { type: 'escape' }
  | { type: 'resume' };

export const initialPickerState: PickerState = {
  leagues: [], teams: {}, followLeagues: [], followTeams: [],
  view: { kind: 'home' }, query: '', cursor: 0, dirty: false, finished: false,
};

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(t: TeamInfo, query: string): boolean {
  const q = fold(query.trim());
  return q === '' || fold(t.name).includes(q) || fold(t.code).includes(q);
}

/** International competitions (European cups, World Cup): a club's "home" is its league. */
const isCup = (slug: string) => slug.startsWith('uefa.') || slug.startsWith('fifa.');

/** What the list shows right now, in order. */
export function rows(s: PickerState): Row[] {
  if (s.view.kind === 'league') {
    const slug = s.view.slug;
    const list = s.teams[slug];
    if (!Array.isArray(list)) return [];
    return list.filter((t) => matches(t, s.query)).map((t) => ({ kind: 'team', ...t, league: slug }));
  }
  if (s.query.trim() === '') {
    return s.leagues.map((l) => ({ kind: 'league', slug: l.slug, name: l.name }));
  }
  // Search across every league. A club in two competitions (league and a
  // European cup) has one id: list it once, under its domestic league.
  const seen = new Set<string>();
  const out: Row[] = [];
  const domesticFirst = [...s.leagues].sort((a, b) => Number(isCup(a.slug)) - Number(isCup(b.slug)));
  for (const l of domesticFirst) {
    const list = s.teams[l.slug];
    if (!Array.isArray(list)) continue;
    for (const t of list) {
      if (!seen.has(t.id) && matches(t, s.query)) {
        seen.add(t.id);
        out.push({ kind: 'team', ...t, league: l.slug });
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Leagues whose team lists are still loading (so search results may be partial). */
export function stillLoading(s: PickerState): boolean {
  return s.leagues.some((l) => s.teams[l.slug] === 'loading' || s.teams[l.slug] === undefined);
}

/** A followed team's display name, from any loaded league; falls back to its id. */
export function teamName(s: PickerState, id: string): string {
  for (const list of Object.values(s.teams)) {
    if (Array.isArray(list)) {
      const t = list.find((x) => x.id === id);
      if (t) return t.name;
    }
  }
  return `team ${id}`;
}

/** Names of followed teams that play in `slug`. */
export function followedIn(s: PickerState, slug: string): string[] {
  const list = s.teams[slug];
  if (!Array.isArray(list)) return [];
  return list.filter((t) => s.followTeams.includes(t.id)).map((t) => t.name);
}

export function settingsOf(s: PickerState): Settings {
  return { leagues: [...s.followLeagues], teams: [...s.followTeams] };
}

const clamp = (n: number, len: number) => (len === 0 ? 0 : Math.max(0, Math.min(n, len - 1)));
const toggled = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

export function pickerReducer(s: PickerState, a: PickerAction): PickerState {
  switch (a.type) {
    case 'loaded':
      return { ...s, leagues: a.leagues, followLeagues: a.settings.leagues, followTeams: a.settings.teams };
    case 'teamsLoaded':
      return { ...s, teams: { ...s.teams, [a.slug]: a.teams } };
    case 'type':
      return { ...s, query: s.query + a.text, cursor: 0 };
    case 'backspace':
      return { ...s, query: s.query.slice(0, -1), cursor: 0 };
    case 'up':
      return { ...s, cursor: clamp(s.cursor - 1, rows(s).length) };
    case 'down':
      return { ...s, cursor: clamp(s.cursor + 1, rows(s).length) };
    case 'pageUp':
      return { ...s, cursor: clamp(s.cursor - a.by, rows(s).length) };
    case 'pageDown':
      return { ...s, cursor: clamp(s.cursor + a.by, rows(s).length) };
    case 'toggle': {
      const row = rows(s)[s.cursor];
      if (!row) return s;
      if (row.kind === 'league') return { ...s, followLeagues: toggled(s.followLeagues, row.slug), dirty: true };
      return { ...s, followTeams: toggled(s.followTeams, row.id), dirty: true };
    }
    case 'open': {
      const row = rows(s)[s.cursor];
      if (!row) return s;
      if (row.kind === 'league') return { ...s, view: { kind: 'league', slug: row.slug }, query: '', cursor: 0 };
      return pickerReducer(s, { type: 'toggle' }); // enter on a team ticks it
    }
    case 'back': {
      if (s.view.kind !== 'league') return s;
      const at = s.leagues.findIndex((l) => l.slug === (s.view as { slug: string }).slug);
      return { ...s, view: { kind: 'home' }, query: '', cursor: Math.max(0, at) };
    }
    case 'escape':
      // Peel one layer at a time: search text, then the league view, then done.
      if (s.query !== '') return { ...s, query: '', cursor: 0 };
      if (s.view.kind === 'league') return pickerReducer(s, { type: 'back' });
      return { ...s, finished: true };
    case 'resume':
      // Saving failed: stay open so the user can retry.
      return { ...s, finished: false };
  }
}
