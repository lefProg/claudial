import { describe, it, expect } from 'vitest';
import { partitionByDay } from '../src/ui/fixtures.js';
import type { Match } from '../src/types.js';

// Anchor `now` to LOCAL noon via the Date constructor so day-bucketing is
// timezone-robust (matches are whole-day offsets from local noon).
const now = new Date(2026, 5, 13, 12, 0, 0).getTime();
const DAY = 86_400_000;
const sAt = (offMs: number) => Math.floor((now + offMs) / 1000);

function m(id: number, offMs: number): Match {
  return {
    id, group: null,
    home: { name: `H${id}`, code: 'AAA' }, away: { name: `A${id}`, code: 'BBB' },
    homeScore: null, awayScore: null, status: 'finished', statusText: '',
    minute: null, startTimestamp: sAt(offMs), varInProgress: false,
  };
}

describe('partitionByDay', () => {
  it('buckets into yesterday/today/future, sorts ascending, drops older', () => {
    const dropped = m(1, -2 * DAY);
    const yA = m(2, -DAY);
    const yB = m(3, -DAY + 3_600_000);
    const today = m(4, 0);
    const fut = m(5, DAY);
    const { yesterday, today: t, future } = partitionByDay([fut, today, yB, yA, dropped], now);
    expect(yesterday.map((x) => x.id)).toEqual([2, 3]);
    expect(t.map((x) => x.id)).toEqual([4]);
    expect(future.map((x) => x.id)).toEqual([5]);
  });

  it('ignores matches with no timestamp', () => {
    const bad = m(9, 0); bad.startTimestamp = 0;
    expect(partitionByDay([bad], now).today).toEqual([]);
  });
});
