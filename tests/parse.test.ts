import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseEvent, parseIncidents } from '../src/api/parse.js';

const today = JSON.parse(readFileSync('tests/fixtures/espn/scoreboard-today.json', 'utf8'));
const range = JSON.parse(readFileSync('tests/fixtures/espn/scoreboard-range.json', 'utf8'));

// today's fixture: Canada 1–1 Bosnia-Herzegovina, finished (FT).
// goals 21' J. Lukic (away) and 78' C. Larin (home); five yellow cards.
const canBih = today.events.find((e: any) => Number(e.id) === 760416);

describe('parseEvent (finished match)', () => {
  const m = parseEvent(canBih);
  it('maps teams, codes, scores', () => {
    expect(m.id).toBe(760416);
    expect(m.home.name).toBe('Canada');
    expect(m.home.code).toBe('CAN');
    expect(m.away.name).toBe('Bosnia-Herzegovina');
    expect(m.away.code).toBe('BIH');
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
  });
  it('maps finished status', () => {
    expect(m.status).toBe('finished');
    expect(m.statusText).toBe('FT');
    expect(m.minute).toBeNull();
    expect(m.varInProgress).toBe(false);
  });
});

describe('parseEvent (live match, synthetic status)', () => {
  // reuse a real event but force an in-progress status to test the minute path
  const liveRaw = { ...canBih, status: { displayClock: "67'", period: 2, type: { state: 'in', name: 'STATUS_SECOND_HALF', shortDetail: "67'" } } };
  const m = parseEvent(liveRaw);
  it('derives minute from displayClock and marks live', () => {
    expect(m.status).toBe('live');
    expect(m.minute).toBe(67);
    expect(m.homeScore).toBe(1);
  });
  it('treats halftime as its own status with no minute', () => {
    const ht = parseEvent({ ...canBih, status: { displayClock: "45'", type: { state: 'in', name: 'STATUS_HALFTIME', shortDetail: 'HT' } } });
    expect(ht.status).toBe('halftime');
    expect(ht.minute).toBeNull();
  });
});

describe('parseEvent (upcoming match)', () => {
  const upRaw = range.events.find((e: any) => e.status?.type?.state === 'pre');
  const m = parseEvent(upRaw);
  it('maps not-started status with null scores and kickoff timestamp', () => {
    expect(m.status).toBe('upcoming');
    expect(m.homeScore).toBeNull();
    expect(m.awayScore).toBeNull();
    expect(m.minute).toBeNull();
    expect(m.startTimestamp).toBe(Math.floor(Date.parse(upRaw.date) / 1000));
    expect(m.startTimestamp).toBeGreaterThan(0);
  });
});

describe('parseIncidents', () => {
  const inc = parseIncidents(canBih);

  it('extracts both goals with scorer, minute and side', () => {
    const goals = inc.filter((i) => i.kind === 'goal');
    expect(goals).toHaveLength(2);
    expect(goals[0]).toMatchObject({ minute: 21, playerShort: 'J. Lukic', isHome: false });
    expect(goals[1]).toMatchObject({ minute: 78, playerShort: 'C. Larin', isHome: true });
  });

  it('extracts all yellow cards', () => {
    expect(inc.filter((i) => i.kind === 'yellowCard')).toHaveLength(5);
  });

  it('returns incidents chronologically (earliest first)', () => {
    const minutes = inc.map((i) => i.minute ?? 0);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it('gives every incident a stable unique id', () => {
    const ids = inc.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignores non-goal, non-card plays', () => {
    expect(inc.every((i) => i.kind === 'goal' || i.kind === 'yellowCard' || i.kind === 'redCard')).toBe(true);
  });

  // synthetic details for kinds/flags absent from the fixture
  it('maps red cards, penalty goals, own goals and home/away side', () => {
    const synthetic = {
      id: 999,
      competitions: [{
        competitors: [
          { homeAway: 'home', team: { id: '100' } },
          { homeAway: 'away', team: { id: '200' } },
        ],
        details: [
          { type: { id: '1' }, clock: { value: 3300, displayValue: "55'" }, team: { id: '200' }, redCard: true, athletesInvolved: [{ id: 'a', displayName: 'Red Guy', shortName: 'R. Guy' }] },
          { type: { id: '2' }, clock: { value: 1800, displayValue: "30'" }, team: { id: '100' }, scoringPlay: true, penaltyKick: true, athletesInvolved: [{ id: 'b', displayName: 'Pen Taker', shortName: 'P. Taker' }] },
          { type: { id: '3' }, clock: { value: 600, displayValue: "10'" }, team: { id: '200' }, scoringPlay: true, ownGoal: true, athletesInvolved: [{ id: 'c', displayName: 'Own Goal', shortName: 'O. Goal' }] },
        ],
      }],
    };
    const out = parseIncidents(synthetic);
    const red = out.find((i) => i.kind === 'redCard')!;
    expect(red.isHome).toBe(false);
    expect(red.player).toBe('Red Guy');
    const pen = out.find((i) => i.detail === 'Penalty')!;
    expect(pen.kind).toBe('goal');
    expect(pen.isHome).toBe(true);
    expect(out.find((i) => i.detail === 'Own goal')!.kind).toBe('goal');
  });
});
