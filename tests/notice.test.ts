import { describe, it, expect } from 'vitest';
import { boardNotice } from '../src/ui/notice.js';

const base = { followsNone: false, stale: false, lastUpdated: 1, matchCount: 0 };

describe('boardNotice', () => {
  it('says offline only when the server was never reached', () => {
    expect(boardNotice({ ...base, stale: true, lastUpdated: null })).toBe('offline');
    expect(boardNotice({ ...base, stale: true, matchCount: 3 })).toBeNull();
  });
  it('asks a new device to pick teams', () => {
    expect(boardNotice({ ...base, followsNone: true })).toBe('follow-nothing');
  });
  it('explains an empty board once data has loaded', () => {
    expect(boardNotice(base)).toBe('no-matches');
    expect(boardNotice({ ...base, lastUpdated: null })).toBeNull(); // still loading
    expect(boardNotice({ ...base, matchCount: 2 })).toBeNull();
  });
});
