import { describe, it, expect } from 'vitest';
import { goalKickFrame, FRAME_MS } from '../src/statusline/anim.js';

describe('goalKickFrame', () => {
  it('advances one frame per FRAME_MS and loops', () => {
    expect(goalKickFrame(0)).not.toBe(goalKickFrame(FRAME_MS));
    expect(goalKickFrame(FRAME_MS * 7)).toBe(goalKickFrame(0)); // 7 frames → wraps
  });
  it('shows the ball and net during the run-up', () => {
    expect(goalKickFrame(0)).toContain('⚽');
    expect(goalKickFrame(0)).toContain('🥅');
  });
  it('flashes GOAL on the final frame', () => {
    expect(goalKickFrame(FRAME_MS * 6)).toContain('G O A L');
  });
});
