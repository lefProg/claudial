export type MatchStatus = 'live' | 'halftime' | 'finished' | 'upcoming';

export interface Team {
  name: string;
  code: string; // FIFA-style nameCode, e.g. "CAN"
}

export interface Match {
  id: number;
  group: string | null; // "Group B", null for knockouts
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  statusText: string; // raw description: "2nd half", "Halftime", "Ended"
  minute: number | null;
  startTimestamp: number; // unix seconds
  varInProgress: boolean;
}

export type IncidentKind =
  | 'goal'
  | 'yellowCard'
  | 'redCard'
  | 'var'
  | 'penaltyMiss'
  | 'substitution'
  | 'injuryTime';

export interface MatchIncident {
  id: string; // stable per incident; synthesized from incident content
  kind: IncidentKind;
  minute: number | null;
  player: string | null; // full name ("Jovo Lukić"); for subs: the player coming on
  playerShort: string | null; // "J. Lukić"
  detail: string | null; // "Penalty", "Own goal", "Goal disallowed", "for <playerOut>", "+4"
  isHome: boolean;
  homeScore: number | null; // running score (goals only)
  awayScore: number | null;
}

export type TakeoverKind = 'goal' | 'redcard' | 'var';

export interface Takeover {
  kind: TakeoverKind;
  match: Match;
  who: string | null; // scorer / carded player; null → scoring team name is shown
  detail: string | null; // VAR: humanized decision; goal: "Penalty"/"Own goal"
  minute: number | null;
  homeScore: number;
  awayScore: number;
}
