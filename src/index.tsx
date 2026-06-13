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

  if (args.includes('--statusline')) {
    const input = await readStdin();
    const { runStatusline, defaultDeps } = await import('./statusline/run.js');
    const line = await runStatusline(input, defaultDeps());
    process.stdout.write(line);
    process.exit(0);
  }

  if (args[0] === 'setup') {
    // @ts-ignore — module created in a later task
    const { runSetup } = await import('./setup/index.js');
    await runSetup(args.slice(1));
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
