#!/usr/bin/env node
import { render } from 'ink';
import { App } from './ui/App.js';
import { resolveSeasonId } from './api/espn.js';

// exit quietly when the consumer of a pipe closes early (e.g. `claudial | head`)
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

async function main(): Promise<void> {
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
