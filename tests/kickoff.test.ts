import { describe, it, expect } from 'vitest';
import { formatKickoff } from '../src/ui/UpcomingSection.js';

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
