import type { Match } from '../../src/types.js';
import { scoreLine, liveLine } from '../../src/statusline/line.js';
import { OFFLINE_AFTER_MS } from '../../src/statusline/run.js';
import type { Flash } from './flash.js';

// Everything the status bar item shows, computed from plain data so it can be
// tested without an editor.

export type BarInput = { live: Match[]; recent: Match[]; upcoming: Match[]; followsNothing: boolean;
  lastOk: number | null; flash: Flash | null; now: number; server?: string };
export type BarView = { text: string; tooltip: string; background: 'warning' | 'error' | null };

const CLICK = 'Click to choose your leagues and teams';

export function barView(i: BarInput): BarView {
  if (i.flash) {
    return { text: i.flash.text, tooltip: [i.flash.detail, CLICK].filter(Boolean).join('\n'), background: i.flash.kind === 'goal' ? 'warning' : 'error' };
  }
  if (i.lastOk == null || i.now - i.lastOk > OFFLINE_AFTER_MS) {
    const where = i.server ? ` at ${i.server}` : '';
    return { text: '⚽ claudial: offline', tooltip: `Can't reach the claudial server${where}. Retrying…`, background: null };
  }
  if (i.followsNothing) return { text: '⚽ claudial: pick your teams', tooltip: CLICK, background: null };
  const line = scoreLine(i.live, i.recent, i.upcoming, i.now);
  if (!line) return { text: '⚽ claudial: no upcoming matches', tooltip: `Nothing scheduled yet for what you follow.\n${CLICK}`, background: null };
  if (i.live.length > 1) {
    // One match plus a count keeps the item short; the tooltip lists them all.
    const text = `${liveLine(i.live[0])} · +${i.live.length - 1} more`;
    return { text, tooltip: [...i.live.map(liveLine), CLICK].join('\n'), background: null };
  }
  const details = i.live.length ? i.live.map(liveLine) : [line];
  return { text: line, tooltip: [...details, CLICK].join('\n'), background: null };
}
