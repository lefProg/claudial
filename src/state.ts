import type { Match, MatchIncident, Takeover } from './types.js';
import type { Prediction } from './predictions/types.js';

export interface AppState {
  live: Match[];
  upcoming: Match[];
  recent: Match[];
  incidents: Record<number, MatchIncident[]>;
  predictions: Prediction[]; // empty unless the predictions engine is enabled
  takeovers: Takeover[]; // [0] is currently playing
  stale: boolean;
  lastUpdated: number | null; // Date.now() ms
}

export type Action =
  | { type: 'live'; matches: Match[]; at: number }
  | { type: 'fixtures'; upcoming: Match[]; recent: Match[] }
  | { type: 'incidents'; matchId: number; incidents: MatchIncident[] }
  | { type: 'predictions'; predictions: Prediction[] }
  | { type: 'takeover'; takeover: Takeover }
  | { type: 'takeoverDone' }
  | { type: 'stale' };

export const initialState: AppState = {
  live: [], upcoming: [], recent: [],
  incidents: {}, predictions: [], takeovers: [],
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
    case 'predictions':
      return { ...s, predictions: a.predictions };
    case 'takeover':
      return { ...s, takeovers: [...s.takeovers, a.takeover] };
    case 'takeoverDone':
      return { ...s, takeovers: s.takeovers.slice(1) };
    case 'stale':
      return { ...s, stale: true };
  }
}
