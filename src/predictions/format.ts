import type { Prediction } from './types.js';

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Compact one-liner for the statusline: "🔮 SUI win 64% · 2-1". */
export function headline(p: Prediction): string {
  return `🔮 ${p.pick.label} ${pct(p.pick.confidence)} · ${p.markets.scoreline}`;
}

/**
 * Full-slate lines for the dashboard, shown beside the next fixture. Returns an
 * array of plain strings (the caller wraps them in ink <Text>).
 */
export function fullSlate(p: Prediction): string[] {
  const { result, over_under_2_5: ou, btts, scoreline } = p.markets;
  const fav =
    result.home >= result.draw && result.home >= result.away
      ? `${p.home_code} ${pct(result.home)}`
      : result.away >= result.draw
        ? `${p.away_code} ${pct(result.away)}`
        : `Draw ${pct(result.draw)}`;
  const ouPick = ou.over >= ou.under ? `O2.5 ${pct(ou.over)}` : `U2.5 ${pct(ou.under)}`;
  const bttsPick = btts.yes >= btts.no ? `BTTS ${pct(btts.yes)}` : `No BTTS ${pct(btts.no)}`;
  return [
    `🔮 PICK: ${p.pick.label} (${pct(p.pick.confidence)})  ·  stake €${p.suggested_stake_eur}`,
    `   1X2 ${fav}   ${ouPick}   ${bttsPick}   score ${scoreline}`,
  ];
}
