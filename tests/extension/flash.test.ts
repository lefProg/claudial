import { describe, it, expect } from 'vitest';
import { FlashTracker, FLASH_MS } from '../../extension/src/flash.js';
import type { Match } from '../../src/types.js';

const m = (home: number, away = 0): Match => ({ id: 1, group: null,
  home: { name: 'Liverpool', code: 'LIV', national: false }, away: { name: 'Manchester United', code: 'MAN', national: false },
  homeScore: home, awayScore: away, status: 'live', statusText: '', minute: 88, startTimestamp: 0, varInProgress: false });
const red = { id: 'r1', homeCode: 'MAN', awayCode: 'SOU', homeName: 'Manchester United', awayName: 'Southampton', player: 'Casemiro', minute: 22, national: false };

describe('FlashTracker', () => {
  it('first sighting never fires', () => {
    const t = new FlashTracker(); t.update([m(6)], [red], {}, 0);
    expect(t.active(0)).toBeNull();
  });
  it('a higher score fires a goal flash with the scorer, for 15 s', () => {
    const t = new FlashTracker(); t.update([m(6)], [], {}, 0);
    t.update([m(7)], [], { 1: [{ minute: 88, player: 'Roberto Firmino' }] }, 1000);
    expect(t.active(1000)).toMatchObject({ kind: 'goal', text: '⚽ GOOOL · Liverpool 7—0 Manchester United', detail: "Roberto Firmino 88'" });
    expect(t.active(1000 + FLASH_MS + 1)).toBeNull();
  });
  it('a new red card fires a red flash', () => {
    const t = new FlashTracker(); t.update([m(6)], [], {}, 0);
    t.update([m(6)], [red], {}, 500);
    expect(t.active(500)).toMatchObject({ kind: 'red', text: '🟥 RED · Casemiro · Manchester United — Southampton' });
  });
  it('later goal replaces earlier flash', () => {
    const t = new FlashTracker(); t.update([m(5)], [], {}, 0);
    t.update([m(6)], [], {}, 100); t.update([m(7)], [], {}, 200);
    expect(t.active(300)?.text).toContain('7—0');
  });
  it('a goal outranks a red card in the same update', () => {
    const t = new FlashTracker(); t.update([m(6)], [], {}, 0);
    t.update([m(7)], [red], {}, 100);
    expect(t.active(100)?.kind).toBe('goal');
  });
  it('a match that kicks off later is a baseline, not a goal', () => {
    const t = new FlashTracker(); t.update([], [], {}, 0);
    t.update([m(1)], [], {}, 100);
    expect(t.active(100)).toBeNull();
  });
});
