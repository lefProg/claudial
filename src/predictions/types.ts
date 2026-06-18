// Mirrors the predictions API contract (predictions/ Django service).
// Kept structurally identical to the JSON so parsing is a straight cast.

export interface PredictionMarkets {
  result: { home: number; draw: number; away: number };
  over_under_2_5: { over: number; under: number };
  btts: { yes: number; no: number };
  scoreline: string; // "2-1"
}

export interface PredictionPick {
  market: string; // "result" | "over_under_2_5" | "btts"
  selection: string; // "home" | "over" | "yes" | ...
  label: string; // "SUI win"
  confidence: number; // 0..1
}

export interface Prediction {
  home_code: string; // FIFA code, e.g. "SUI"
  away_code: string;
  kickoff_date: string; // "YYYY-MM-DD" (UTC)
  kickoff_ts: number; // unix seconds
  markets: PredictionMarkets;
  pick: PredictionPick;
  suggested_stake_eur: number; // €1-5
  rationale: string;
  disclaimer: string;
}
