import { describe, it, expect } from 'vitest';
import { serial } from '../../extension/src/serial.js';

describe('serial', () => {
  it('a call during a run triggers exactly one more run afterwards, so no update is lost', async () => {
    let runs = 0; let release!: () => void;
    const job = serial(async () => { runs++; if (runs === 1) await new Promise<void>((r) => { release = r; }); });
    const first = job();
    const second = job(); const third = job();          // arrive while run 1 is in flight
    release();
    await Promise.all([first, second, third]);
    expect(runs).toBe(2);
  });
  it('calls far apart each run once', async () => {
    let runs = 0;
    const job = serial(async () => { runs++; });
    await job(); await job();
    expect(runs).toBe(2);
  });
});
