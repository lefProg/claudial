#!/usr/bin/env node
import { render } from 'ink';
import { App } from './ui/App.js';
import { resolveSeasonId } from './api/espn.js';

// exit quietly when the consumer of a pipe closes early (e.g. `claudial | head`)
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === 'setup') {
    const { runSetup } = await import('./setup/index.js');
    await runSetup(args.slice(1));
    process.exit(0);
  }

  if (args.includes('--mock-goal')) {
    // Demo trigger for recording: show ARG 1—1 ENG live in the status bar for
    // ~2s, then Harry Kane scores → 1—2 and a GOOOL celebration for 15s. Writes
    // to the shared statusline cache, so the bar (which Claude Code repaints on
    // its timer) plays the sequence. Run e.g. `!claudial --mock-goal` while
    // recording.
    const { makeCache } = await import('./statusline/cache.js');
    const { liveLine } = await import('./statusline/line.js');
    const cache = makeCache();
    const base = {
      id: 9001, group: null,
      home: { name: 'Argentina', code: 'ARG' }, away: { name: 'England', code: 'ENG' },
      status: 'live' as const, statusText: '', minute: 78, startTimestamp: 0, varInProgress: false,
    };
    cache.write(liveLine({ ...base, homeScore: 1, awayScore: 1 }));
    process.stdout.write('⚽ mock: ARG 1—1 ENG live… (Kane scores in 2s)\n');
    await new Promise((r) => setTimeout(r, 2000));
    const scored = { ...base, homeScore: 1, awayScore: 2 };
    cache.write(liveLine(scored));
    cache.armGoal(scored);
    process.stdout.write('⚽ GOOOL! ARG 1—2 ENG — the status bar celebrates for 15s.\n');
    process.exit(0);
  }

  if (args.includes('--mock-redcard')) {
    const { makeCache } = await import('./statusline/cache.js');
    makeCache().armRedCard({ player: 'Otamendi', homeCode: 'ARG', awayCode: 'ENG' });
    process.stdout.write('🟥 RED armed — the Claude Code status bar flashes a red card (ARG—ENG) for 15s.\n');
    process.exit(0);
  }

  if (args.includes('--statusline')) {
    const input = await readStdin();
    const { runStatusline, defaultDeps } = await import('./statusline/run.js');
    let out = await runStatusline(input, defaultDeps());
    // --wrap '<cmd>': run the user's existing statusline with the same stdin and
    // prepend its output, so claudial co-exists with their bar instead of replacing it.
    const w = args.indexOf('--wrap');
    if (w >= 0 && args[w + 1]) {
      try {
        const { execSync } = await import('node:child_process');
        const theirs = execSync(args[w + 1], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 2000 }).replace(/\n+$/, '');
        if (theirs) out = `${theirs}  ${out}`;
      } catch { /* their command failed — just show ours */ }
    }
    process.stdout.write(out);
    process.exit(0);
  }

  let seasonId: number;
  try {
    seasonId = await resolveSeasonId();
  } catch {
    console.error('claudial: could not reach ESPN. Check your connection and try again.');
    process.exit(1);
  }
  if (!process.stdout.isTTY) {
    const { printSnapshot } = await import('./snapshot.js');
    await printSnapshot(seasonId);
    return;
  }

  const mode = process.argv.includes('--ticker') ? 'ticker' : 'board';
  render(<App seasonId={seasonId} mode={mode} />);
}

main().catch(() => {
  console.error('claudial: could not reach ESPN. Check your connection and try again.');
  process.exit(1);
});
