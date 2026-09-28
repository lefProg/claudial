import { describe, it, expect } from 'vitest';
import { formatKickoff, kickoffColumn } from '../src/ui/UpcomingSection.js';

const now = Date.UTC(2026, 8, 27, 12, 0); // Sun 27 Sep 2026
const at = (days: number) => Math.floor((now + days * 86_400_000) / 1000);

describe('formatKickoff', () => {
  it('shows only the time today', () => {
    expect(formatKickoff(at(0.1), now)).not.toMatch(/[A-Za-z]{3} /);
  });
  it('shows the weekday within the week', () => {
    expect(formatKickoff(at(3), now)).not.toMatch(/\d{1,2}.*(Sep|Oct)|(Sep|Oct).*\d{1,2} /);
  });
  it('adds the date further out, so a kickoff weeks away is unambiguous', () => {
    expect(formatKickoff(at(13), now)).toMatch(/Oct/);
  });
});

describe('kickoffColumn', () => {
  it('always leaves a gap before the teams, even for long dates', () => {
    for (const d of [0.1, 3, 13, 25]) {
      const col = kickoffColumn(at(d), now);
      expect(col.endsWith(' ')).toBe(true);
      expect(col.length).toBeGreaterThanOrEqual(22);
    }
  });
});

describe('kickoffColumn width', () => {
  it('pads to the given list width, not a fixed 22', () => {
    expect(kickoffColumn(at(3), now, 14).length).toBe(14);
  });
});

describe('kickoffWidth', () => {
  it('fits the longest kickoff in a list plus a two-space gap', async () => {
    const { kickoffWidth, formatKickoff: f } = await import('../src/ui/kickoff.js');
    const list = [at(3), at(13)];
    expect(kickoffWidth(list, now)).toBe(Math.max(...list.map((t) => f(t, now).length)) + 2);
    expect(kickoffWidth([], now)).toBe(22);
  });
});
