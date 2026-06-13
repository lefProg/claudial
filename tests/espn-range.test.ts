import { describe, it, expect } from 'vitest';
import { pastRange } from '../src/api/espn.js';

describe('pastRange', () => {
  it('spans daysBack days ago through today (UTC, YYYYMMDD-YYYYMMDD)', () => {
    const now = Date.UTC(2026, 5, 13, 12, 0, 0); // 2026-06-13
    expect(pastRange(1, now)).toBe('20260612-20260613');
  });
  it('handles a 0-day range as a single day', () => {
    const now = Date.UTC(2026, 5, 13, 12, 0, 0);
    expect(pastRange(0, now)).toBe('20260613-20260613');
  });
  it('crosses a month boundary', () => {
    const now = Date.UTC(2026, 6, 1, 0, 30, 0); // 2026-07-01
    expect(pastRange(1, now)).toBe('20260630-20260701');
  });
});
