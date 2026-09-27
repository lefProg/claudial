import { describe, it, expect } from 'vitest';
import {
  initialPickerState, pickerReducer, rows, settingsOf, followedIn, teamName, stillLoading,
  type PickerAction, type PickerState,
} from '../src/ui/picker/state.js';

const leagues = [
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'gre.1', name: 'Super League Greece' },
  { slug: 'uefa.europa.conf', name: 'Conference League' },
];
const gre = [
  { id: '443', name: 'Panathinaikos', code: 'PAO' },
  { id: '11431', name: 'Panetolikos', code: 'PAN' },
  { id: '435', name: 'Olympiacos', code: 'OLY' },
];
const eng = [{ id: '359', name: 'Arsenal', code: 'ARS' }];
const conf = [{ id: '443', name: 'Panathinaikos', code: 'PAO' }]; // same club, a cup

function run(...actions: PickerAction[]): PickerState {
  return actions.reduce(pickerReducer, initialPickerState);
}
const loaded: PickerAction[] = [
  { type: 'loaded', leagues, settings: { leagues: [], teams: [] } },
  { type: 'teamsLoaded', slug: 'eng.1', teams: eng },
  { type: 'teamsLoaded', slug: 'gre.1', teams: gre },
  { type: 'teamsLoaded', slug: 'uefa.europa.conf', teams: conf },
];
const typed = (text: string): PickerAction[] => [...text].map((c) => ({ type: 'type', text: c }));

describe('home screen', () => {
  it('lists leagues when the search is empty', () => {
    expect(rows(run(...loaded)).map((r) => r.name)).toEqual(['Premier League', 'Super League Greece', 'Conference League']);
  });

  it('searches teams across every league, accent- and case-insensitive, one row per club', () => {
    const s = run(...loaded, ...typed('PANA'));
    expect(rows(s).map((r) => r.name)).toEqual(['Panathinaikos']);
    expect(rows(s)[0]).toMatchObject({ kind: 'team', league: 'gre.1' }); // its league, not the cup
    const all = run(...loaded, ...typed('pan'));
    expect(all.cursor).toBe(0);
    expect(rows(all).map((r) => r.name)).toEqual(['Panathinaikos', 'Panetolikos']);
  });

  it('ticks a team with space and a league with space', () => {
    const team = run(...loaded, ...typed('arsen'), { type: 'toggle' });
    expect(team.followTeams).toEqual(['359']);
    expect(team.dirty).toBe(true);
    const league = run(...loaded, { type: 'down' }, { type: 'toggle' });
    expect(league.followLeagues).toEqual(['gre.1']);
    expect(run(...loaded, { type: 'down' }, { type: 'toggle' }, { type: 'toggle' }).followLeagues).toEqual([]);
  });

  it('keeps the cursor inside the list', () => {
    const s = run(...loaded, { type: 'up' }, { type: 'down' }, { type: 'down' }, { type: 'down' }, { type: 'down' });
    expect(s.cursor).toBe(2);
    expect(run(...loaded, { type: 'pageDown', by: 50 }).cursor).toBe(2);
  });
});

describe('league screen', () => {
  it('enter opens a league; typing filters its teams; enter on a team ticks it', () => {
    const s = run(...loaded, { type: 'down' }, { type: 'open' }, ...typed('oly'), { type: 'open' });
    expect(s.view).toEqual({ kind: 'league', slug: 'gre.1' });
    expect(rows(s).map((r) => r.name)).toEqual(['Olympiacos']);
    expect(s.followTeams).toEqual(['435']);
    expect(followedIn(s, 'gre.1')).toEqual(['Olympiacos']);
  });

  it('esc peels one layer at a time: search, then league, then done', () => {
    let s = run(...loaded, { type: 'down' }, { type: 'open' }, ...typed('oly'));
    s = pickerReducer(s, { type: 'escape' });
    expect(s.query).toBe('');
    expect(s.view.kind).toBe('league');
    s = pickerReducer(s, { type: 'escape' });
    expect(s.view.kind).toBe('home');
    expect(s.cursor).toBe(1); // back on the league we came from
    expect(s.finished).toBe(false);
    s = pickerReducer(s, { type: 'escape' });
    expect(s.finished).toBe(true);
  });

  it('left arrow goes back without finishing', () => {
    const s = run(...loaded, { type: 'open' }, { type: 'back' });
    expect(s.view.kind).toBe('home');
    expect(s.finished).toBe(false);
  });
});

describe('saving and summaries', () => {
  it('starts from the device settings and saves exactly what is ticked', () => {
    const start = run({ type: 'loaded', leagues, settings: { leagues: ['eng.1'], teams: ['443'] } }, ...loaded.slice(1));
    expect(start.dirty).toBe(false);
    const s = run(
      { type: 'loaded', leagues, settings: { leagues: ['eng.1'], teams: ['443'] } }, ...loaded.slice(1),
      { type: 'toggle' }, // untick Premier League
      ...typed('olymp'), { type: 'toggle' },
    );
    expect(settingsOf(s)).toEqual({ leagues: [], teams: ['443', '435'] });
    expect(teamName(s, '443')).toBe('Panathinaikos');
    expect(teamName(s, '999')).toBe('team 999');
  });

  it('resume reopens after a failed save', () => {
    const s = run(...loaded, { type: 'escape' }, { type: 'resume' });
    expect(s.finished).toBe(false);
  });

  it('knows when search results may still be partial', () => {
    expect(stillLoading(run(loaded[0]!))).toBe(true);
    expect(stillLoading(run(...loaded))).toBe(false);
  });
});
