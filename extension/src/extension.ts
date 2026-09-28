import * as vscode from 'vscode';
import {
  fetchIncidents, fetchLive, fetchLiveRedCards, fetchRecent, fetchUpcoming, followsNothing,
  apiUrl, getSettings, invalidateState, listLeagues, listTeams, putSettings, setServerUrl, subscribeEvents,
  type Settings, type TeamInfo,
} from '../../src/api/backend.js';
import type { Match } from '../../src/types.js';
import { barView } from './bar.js';
import { FlashTracker } from './flash.js';
import { pickItems, settingsFrom, type PickItem } from './pick.js';
import { serial } from './serial.js';

// The editor glue: one status bar item fed by the claudial server (push events
// plus a safety poll), and a quick pick to choose what you follow. All the
// decisions live in bar.ts, flash.ts and pick.ts.

const POLL_MS = 30_000;

type Data = { live: Match[]; recent: Match[]; upcoming: Match[]; followsNothing: boolean };

export function activate(ctx: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem('claudial.score', vscode.StatusBarAlignment.Right, 100);
  item.name = 'claudial';
  item.command = 'claudial.follow';
  item.text = '⚽ claudial';
  item.show();

  const applyServer = () => setServerUrl(vscode.workspace.getConfiguration('claudial').get<string>('serverUrl') ?? null);
  applyServer();

  const tracker = new FlashTracker();
  let data: Data = { live: [], recent: [], upcoming: [], followsNothing: false };
  let lastOk: number | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  const render = () => {
    const now = Date.now();
    const v = barView({ ...data, lastOk, flash: tracker.active(now), now, server: apiUrl() });
    item.text = v.text;
    item.tooltip = v.tooltip;
    item.backgroundColor = v.background ? new vscode.ThemeColor(`statusBarItem.${v.background}Background`) : undefined;
  };

  const load = async () => {
    try {
      const [live, recent, upcoming, reds, none] = await Promise.all([
        fetchLive(), fetchRecent(2026), fetchUpcoming(2026), fetchLiveRedCards(), followsNothing(),
      ]);
      const scorers: Record<number, { minute: number | null; player: string | null }[]> = {};
      for (const m of live) scorers[m.id] = (await fetchIncidents(m.id)).filter((i) => i.kind === 'goal');
      tracker.update(live, reds, scorers, Date.now());
      data = { live, recent, upcoming, followsNothing: none };
      lastOk = Date.now();
      const f = tracker.active(Date.now());
      clearTimeout(flashTimer);
      if (f) flashTimer = setTimeout(render, f.until - Date.now() + 50);
    } catch {
      // Offline: barView switches to the offline text once OFFLINE_AFTER_MS passes.
    }
    render();
  };
  // One refresh at a time; a request during one (a goal push) gets one more run after it.
  const refresh = serial(load);
  const fresh = () => { invalidateState(); return refresh(); };

  let stopStream = subscribeEvents(() => { void fresh(); });
  const restartStream = () => { stopStream(); stopStream = subscribeEvents(() => { void fresh(); }); };
  const poll = setInterval(() => { void fresh(); }, POLL_MS);
  // Keep the offline check honest even when every request hangs.
  const tick = setInterval(render, POLL_MS);

  ctx.subscriptions.push(
    item,
    { dispose: () => { stopStream(); clearInterval(poll); clearInterval(tick); clearTimeout(flashTimer); } },
    vscode.window.onDidChangeWindowState((s) => { if (s.focused) void fresh(); }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('claudial.serverUrl')) return;
      applyServer();
      lastOk = null;
      restartStream();
      void fresh();
    }),
    vscode.commands.registerCommand('claudial.refresh', () => fresh()),
    vscode.commands.registerCommand('claudial.follow', () => pickTeams(async () => { restartStream(); await fresh(); })),
  );
  void refresh();
}

type Row = vscode.QuickPickItem & { src: PickItem };

async function pickTeams(onSaved: () => Promise<void>): Promise<void> {
  const qp = vscode.window.createQuickPick<Row>();
  qp.title = 'claudial: what do you follow?';
  qp.placeholder = 'Type a team or league, e.g. "liverpool". Tick with space, save with Enter.';
  qp.canSelectMany = true;
  qp.matchOnDescription = true;
  qp.busy = true;
  qp.onDidHide(() => qp.dispose());
  qp.show();

  let loaded = false;
  let before: Settings = { leagues: [], teams: [] };
  try {
    const [leagues, settings] = await Promise.all([listLeagues(), getSettings()]);
    const lists = await Promise.all(leagues.map((l) => listTeams(l.slug).catch((): TeamInfo[] | null => null)));
    const teams = Object.fromEntries(leagues.map((l, i) => [l.slug, lists[i]]));
    const rows: Row[] = pickItems(leagues, teams, settings).map((p) => ({ label: p.label, description: p.description, src: p }));
    qp.items = rows;
    qp.selectedItems = rows.filter((r) => r.src.picked);
    before = settings;
    loaded = true;
  } catch {
    qp.placeholder = "Can't reach the claudial server. Close this and try again in a moment.";
  }
  qp.busy = false;
  if (!loaded) return;

  qp.onDidAccept(async () => {
    qp.busy = true;
    try {
      await putSettings(settingsFrom(qp.selectedItems.map((r) => r.src), qp.items.map((r) => r.src), before));
      qp.hide();
      await onSaved();
    } catch {
      qp.busy = false;
      qp.placeholder = 'Not saved: the claudial server did not answer. Press Enter to try again.';
    }
  });
}

export function deactivate(): void {
  // Everything is disposed through ctx.subscriptions.
}
