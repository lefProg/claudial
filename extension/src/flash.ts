import type { Match } from '../../src/types.js';
import type { RedCardEvent } from '../../src/api/backend.js';
import { homeName, awayName } from '../../src/ui/flags.js';

// When the status bar should flash, and with what. The first state it sees is
// only a baseline, so opening the editor mid-match never replays old goals.

export const FLASH_MS = 15_000;
export type Flash = { kind: 'goal' | 'red'; text: string; detail: string; until: number };
type Scorer = { minute: number | null; player: string | null };

export class FlashTracker {
  private totals: Map<number, number> | null = null;
  private seenReds = new Set<string>();
  private flash: Flash | null = null;

  update(live: Match[], reds: RedCardEvent[], scorers: Record<number, Scorer[]>, now: number): void {
    const first = this.totals === null;
    const totals = new Map(live.map((m) => [m.id, (m.homeScore ?? 0) + (m.awayScore ?? 0)]));
    let goal: Flash | null = null;
    if (!first) {
      for (const m of live) {
        const was = this.totals!.get(m.id);
        if (was !== undefined && totals.get(m.id)! > was) {
          const last = (scorers[m.id] ?? []).at(-1);
          goal = {
            kind: 'goal', until: now + FLASH_MS,
            text: `⚽ GOOOL · ${homeName(m.home)} ${m.homeScore ?? 0}—${m.awayScore ?? 0} ${awayName(m.away)}`,
            detail: last?.player ? `${last.player} ${last.minute ?? '?'}'` : '',
          };
        }
      }
    }
    let red: Flash | null = null;
    for (const r of reds) {
      if (this.seenReds.has(r.id)) continue;
      this.seenReds.add(r.id);
      if (first) continue;
      const home = homeName({ name: r.homeName ?? r.homeCode, code: r.homeCode, national: r.national });
      const away = awayName({ name: r.awayName ?? r.awayCode, code: r.awayCode, national: r.national });
      red = { kind: 'red', until: now + FLASH_MS, text: `🟥 RED · ${r.player} · ${home} — ${away}`, detail: `${r.player} ${r.minute ?? '?'}'` };
    }
    this.totals = totals;
    if (goal) this.flash = goal;
    else if (red) this.flash = red;
  }

  active(now: number): Flash | null {
    return this.flash && now <= this.flash.until ? this.flash : null;
  }
}
