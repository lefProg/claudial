import { describe, it, expect } from 'vitest';
import { barView } from '../../extension/src/bar.js';
import type { Match } from '../../src/types.js';

const live: Match = { id: 1, group: null, home: { name: 'Liverpool', code: 'LIV', national: false }, away: { name: 'Manchester United', code: 'MAN', national: false },
  homeScore: 6, awayScore: 0, status: 'live', statusText: "87'", minute: 87, startTimestamp: 0, varInProgress: false };
const base = { live: [] as Match[], recent: [] as Match[], upcoming: [] as Match[], followsNothing: false, lastOk: 1000, flash: null, now: 2000 };

describe('barView', () => {
  it('shows live matches with full names', () => {
    expect(barView({ ...base, live: [live] }).text).toBe("⚽ Liverpool 6—0 Manchester United 87'");
  });
  it('asks a new device to pick teams', () => {
    expect(barView({ ...base, followsNothing: true }).text).toBe('⚽ claudial: pick your teams');
  });
  it('says when nothing is scheduled', () => {
    expect(barView(base).text).toBe('⚽ claudial: no upcoming matches');
  });
  it('offline before first data', () => {
    expect(barView({ ...base, lastOk: null }).text).toBe('⚽ claudial: offline');
  });
  it('offline after two minutes without a good fetch, even with old data', () => {
    expect(barView({ ...base, live: [live], lastOk: 0, now: 120_001 }).text).toBe('⚽ claudial: offline');
  });
  it('a goal flash wins, on the warning background', () => {
    const v = barView({ ...base, live: [live], flash: { kind: 'goal', text: '⚽ GOOOL · Liverpool 7—0 Manchester United', detail: "Roberto Firmino 88'", until: 9e9 } });
    expect(v).toMatchObject({ text: '⚽ GOOOL · Liverpool 7—0 Manchester United', background: 'warning' });
    expect(v.tooltip).toContain('Roberto Firmino');
  });
  it('a red flash uses the error background', () => {
    expect(barView({ ...base, flash: { kind: 'red', text: '🟥 RED · Casemiro · Manchester United — Southampton', detail: '', until: 9e9 } }).background).toBe('error');
  });
  it('the tooltip says how to change teams', () => {
    expect(barView({ ...base, live: [live] }).tooltip).toContain('Click to choose');
  });
});

describe('barView with many live matches and offline detail', () => {
  const second: Match = { ...live, id: 2, home: { name: 'Arsenal', code: 'ARS', national: false }, away: { name: 'Chelsea', code: 'CHE', national: false }, homeScore: 1, awayScore: 1, minute: 40 };
  const third: Match = { ...second, id: 3, home: { name: 'Everton', code: 'EVE', national: false } };
  it('shows the first live match and a count, with every match in the tooltip', () => {
    const v = barView({ ...base, live: [live, second, third] });
    expect(v.text).toBe("⚽ Liverpool 6—0 Manchester United 87' · +2 more");
    expect(v.tooltip).toContain('Arsenal 1—1 Chelsea');
    expect(v.tooltip).toContain('Everton 1—1 Chelsea');
  });
  it('names the server in the offline tooltip', () => {
    expect(barView({ ...base, lastOk: null, server: 'http://161.97.67.12:30083' }).tooltip).toContain('http://161.97.67.12:30083');
  });
});
