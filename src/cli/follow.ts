import { rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  ApiError, forgetDevice, getSettings, listLeagues, listTeams, putSettings,
  type LeagueInfo, type Settings, type TeamInfo,
} from '../api/backend.js';
import { configDir } from '../api/device.js';

// `claudial leagues | teams | follow | unfollow | following | forget`:
// what this device follows on the claudial server.

export const FOLLOW_COMMANDS = ['leagues', 'teams', 'follow', 'unfollow', 'following', 'forget'] as const;

const USAGE = `usage:
  claudial follow                      pick your leagues and teams from a list
  claudial leagues                     the leagues you can follow (✓ = following)
  claudial teams <league> [search]     a league's teams and their ids, e.g. claudial teams gre.1 pana
  claudial follow <league|team id>...  e.g. claudial follow gre.1 443
  claudial unfollow <league|team id>...
  claudial following                   what this device follows
  claudial forget                      delete this device from the server`;

type Out = (line: string) => void;

/** Pure: apply follow/unfollow targets to settings. Slugs are leagues, digits are team ids. */
export function applyTargets(s: Settings, targets: string[], follow: boolean, known: LeagueInfo[]): Settings {
  const leagues = new Set(s.leagues);
  const teams = new Set(s.teams);
  for (const t of targets) {
    if (/^\d+$/.test(t)) {
      if (follow) { teams.add(t); } else { teams.delete(t); }
    } else if (known.some((l) => l.slug === t)) {
      if (follow) { leagues.add(t); } else { leagues.delete(t); }
    } else {
      throw new Error(`"${t}" is neither a league slug (see: claudial leagues) nor a team id (see: claudial teams <league>)`);
    }
  }
  return { leagues: [...leagues], teams: [...teams] };
}

/** Pure: case- and accent-insensitive match on a team's name or code. */
export function matchesSearch(t: TeamInfo, search: string): boolean {
  const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = fold(search);
  return fold(t.name).includes(q) || fold(t.code).includes(q);
}

export async function runFollow(args: string[], out: Out = console.log): Promise<number> {
  const [cmd, ...rest] = args;
  try {
    switch (cmd) {
      case 'leagues': {
        const [leagues, s] = await Promise.all([listLeagues(), getSettings()]);
        for (const l of leagues) out(`${s.leagues.includes(l.slug) ? '✓' : ' '} ${l.slug.padEnd(18)} ${l.name}`);
        return 0;
      }
      case 'teams': {
        const [league, search] = rest;
        if (!league) { out(USAGE); return 2; }
        const [teams, s] = await Promise.all([listTeams(league), getSettings()]);
        const shown = search ? teams.filter((t) => matchesSearch(t, search)) : teams;
        for (const t of shown) out(`${s.teams.includes(t.id) ? '✓' : ' '} ${t.id.padStart(7)}  ${t.code.padEnd(10)} ${t.name}`);
        if (shown.length === 0) out('no team matches');
        return 0;
      }
      case 'follow':
      case 'unfollow': {
        if (rest.length === 0 && cmd === 'follow' && process.stdin.isTTY) {
          const { runPicker } = await import('../ui/picker/run.js');
          await runPicker();
          return 0;
        }
        if (rest.length === 0) { out(USAGE); return 2; }
        const [leagues, s] = await Promise.all([listLeagues(), getSettings()]);
        const next = applyTargets(s, rest, cmd === 'follow', leagues);
        const saved = await putSettings(next);
        out(`following ${saved.leagues.length} league(s) and ${saved.teams.length} team(s)`);
        return 0;
      }
      case 'following': {
        const [leagues, s] = await Promise.all([listLeagues(), getSettings()]);
        const name = new Map(leagues.map((l) => [l.slug, l.name]));
        out(s.leagues.length ? `leagues: ${s.leagues.map((l) => `${l} (${name.get(l) ?? '?'})`).join(', ')}` : 'leagues: none');
        out(s.teams.length ? `teams:   ${s.teams.join(', ')}  (names: claudial teams <league>)` : 'teams:   none');
        return 0;
      }
      case 'forget': {
        await forgetDevice();
        // A new identity next time. `onboarded` was written by versions that auto-followed.
        const dir = configDir();
        rmSync(join(dir, 'device-id'), { force: true });
        rmSync(join(dir, 'onboarded'), { force: true });
        out('the server no longer has anything about this device');
        return 0;
      }
      default:
        out(USAGE);
        return 2;
    }
  } catch (e) {
    const msg = e instanceof ApiError ? `server said: ${e.message}` : e instanceof Error ? e.message : String(e);
    out(`claudial: ${msg}`);
    return 1;
  }
}
