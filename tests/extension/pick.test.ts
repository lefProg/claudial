import { describe, it, expect } from 'vitest';
import { pickItems, settingsFrom } from '../../extension/src/pick.js';

const leagues = [{ slug: 'eng.1', name: 'Premier League' }, { slug: 'gre.1', name: 'Super League Greece' }];
const teams = { 'eng.1': [{ id: '364', name: 'Liverpool', code: 'LIV' }], 'gre.1': null };

describe('pickItems', () => {
  it('lists leagues first, then teams, with current follows ticked', () => {
    const items = pickItems(leagues, teams, { leagues: ['gre.1'], teams: ['364'] });
    expect(items.map((i) => [i.kind, i.label, i.picked])).toEqual([
      ['league', 'Premier League', false], ['league', 'Super League Greece', true], ['team', 'Liverpool', true]]);
    expect(items[2].description).toBe('Premier League');
  });
  it('failed league is skipped', () => {
    expect(pickItems(leagues, teams, { leagues: [], teams: [] }).filter((i) => i.kind === 'team')).toHaveLength(1);
  });
  it('a team in two competitions appears once, described by its first league', () => {
    const t = { 'eng.1': [{ id: '364', name: 'Liverpool', code: 'LIV' }], 'gre.1': [{ id: '364', name: 'Liverpool', code: 'LIV' }] };
    const found = pickItems(leagues, t, { leagues: [], teams: [] }).filter((i) => i.id === '364');
    expect(found).toHaveLength(1);
    expect(found[0].description).toBe('Premier League');
  });
  it('turns the chosen items back into settings', () => {
    const items = pickItems(leagues, teams, { leagues: [], teams: [] });
    expect(settingsFrom([items[0], items[2]])).toEqual({ leagues: ['eng.1'], teams: ['364'] });
  });
});

describe('settingsFrom keeps what the picker could not show', () => {
  it('a followed team whose league failed to load is not unfollowed by saving', () => {
    const before = { leagues: ['gre.1'], teams: ['443', '364'] };      // 443 lives in gre.1, whose list failed
    const items = pickItems(leagues, teams, before);                  // no row for 443
    const chosen = items.filter((i) => i.id === '364');               // user keeps Liverpool, unticks gre.1
    expect(settingsFrom(chosen, items, before)).toEqual({ leagues: [], teams: ['364', '443'] });
  });
});
