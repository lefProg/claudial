import { homedir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { render } from 'ink';
import { parseFlags, type SetupOptions } from './flags.js';
import { detectShell, rcPathFor, isOnPath, type Shell } from './detect.js';
import { applySetup, type ApplyContext } from './apply.js';
import { Wizard } from './Wizard.js';

function commandFor(): string {
  return isOnPath('claudial') ? 'claudial --statusline' : 'npx claudial --statusline';
}

function contextFor(opts: SetupOptions): ApplyContext {
  const shell: Shell = opts.shell ?? detectShell();
  // Always global — setup installs the statusline into ~/.claude/settings.json.
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  return {
    settingsPath,
    rcPath: rcPathFor(shell, homedir()),
    shell,
    command: commandFor(),
    conflict: 'overwrite',
  };
}

function printReport(opts: SetupOptions, ctx: ApplyContext, report: ReturnType<typeof applySetup>): void {
  if (report.statuslineWritten) {
    console.log(`✓ statusline installed → ${ctx.settingsPath}`);
    if (report.statuslineBackedUp) console.log(`  (previous settings backed up to ${ctx.settingsPath}.bak)`);
    console.log('  Restart Claude Code to see the score bar.');
  } else if (opts.statusline) {
    console.log('• statusline unchanged (an existing statusLine was kept).');
  }
  if (report.aliasAppended) {
    console.log(`✓ tmux alias added → ${ctx.rcPath}`);
    console.log(`  Open a new shell, then run: claude-mundial`);
  } else if (opts.tmux) {
    console.log('• tmux alias already present — left as-is.');
  }
  if (!opts.statusline && !opts.tmux) console.log('Nothing selected. Run `claudial setup` again to choose options.');
}

export async function runSetup(args: string[]): Promise<void> {
  const opts = parseFlags(args);

  const run = (final: SetupOptions) => {
    const ctx = contextFor(final);
    printReport(final, ctx, applySetup(final, ctx));
  };

  if (!opts.interactive) { run(opts); return; }

  await new Promise<void>((resolve) => {
    const { waitUntilExit } = render(
      React.createElement(Wizard, {
        defaultShell: detectShell(),
        onDone: (final: SetupOptions) => run(final),
      }),
    );
    waitUntilExit().then(() => resolve());
  });
}
