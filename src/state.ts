import type { Match, MatchIncident, Takeover } from './types.js';

export interface AppState {
  live: Match[];
  upcoming: Match[];
  recent: Match[];
  incidents: Record<number, MatchIncident[]>;
  takeovers: Takeover[]; // [0] is currently playing
  stale: boolean;
  lastUpdated: number | null; // Date.now() ms
}

export type Action =
  | { type: 'live'; matches: Match[]; at: number }
  | { type: 'fixtures'; upcoming: Match[]; recent: Match[] }
  | { type: 'incidents'; matchId: number; incidents: MatchIncident[] }
  | { type: 'takeover'; takeover: Takeover }
  | { type: 'takeoverDone' }
  | { type: 'stale' };

export const initialState: AppState = {
  live: [], upcoming: [], recent: [],
  incidents: {}, takeovers: [],
  stale: false, lastUpdated: null,
};

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'live':
      return { ...s, live: a.matches, stale: false, lastUpdated: a.at };
    case 'fixtures':
      return { ...s, upcoming: a.upcoming, recent: a.recent };
    case 'incidents':
      return { ...s, incidents: { ...s.incidents, [a.matchId]: a.incidents } };
    case 'takeover':
      return { ...s, takeovers: [...s.takeovers, a.takeover] };
    case 'takeoverDone':
      return { ...s, takeovers: s.takeovers.slice(1) };
    case 'stale':
      return { ...s, stale: true };
  }
}
