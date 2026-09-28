import { homedir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { render } from 'ink';
import { parseFlags, type SetupOptions } from './flags.js';
import { detectShell, rcPathFor, isOnPath, hasCursor, type Shell } from './detect.js';
import { cursorConfigPath } from './cursor.js';
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
    cursorPath: cursorConfigPath(homedir()),
    rcPath: rcPathFor(shell, homedir()),
    shell,
    command: commandFor(),
    conflict: 'overwrite',
  };
}

function printReport(opts: SetupOptions, ctx: ApplyContext, report: ReturnType<typeof applySetup>): void {
  if (report.statuslineWritten) {
    console.log(`✓ statusline installed → ${ctx.settingsPath}`);
    if (report.statuslineWrapped) console.log('  (kept your existing status line and appended the score)');
    if (report.statuslineBackedUp) console.log(`  (previous settings backed up to ${ctx.settingsPath}.bak)`);
    console.log('  Restart Claude Code to see the score bar.');
  } else if (opts.statusline) {
    console.log('• statusline unchanged (an existing statusLine was kept).');
  }
  if (report.cursorWritten) {
    console.log(`✓ Cursor CLI statusline installed → ${ctx.cursorPath}`);
    if (report.cursorWrapped) console.log('  (kept your existing status line and appended the score)');
    if (report.cursorBackedUp) console.log(`  (previous config backed up to ${ctx.cursorPath}.bak)`);
  } else if (opts.cursor) {
    console.log('• Cursor CLI statusline already installed.');
  }
  if (report.aliasAppended) {
    console.log(`✓ tmux alias added → ${ctx.rcPath}`);
    console.log(`  Open a new shell, then run: claude-mundial`);
  } else if (opts.tmux) {
    console.log('• tmux alias already present — left as-is.');
  }
  if (!opts.statusline && !opts.cursor && !opts.tmux) console.log('Nothing selected. Run `claudial setup` again to choose options.');
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
        cursorFound: hasCursor(homedir()),
        onDone: (final: SetupOptions) => run(final),
      }),
    );
    waitUntilExit().then(() => resolve());
  });

  // Second step: what to follow. Skippable with esc; `claudial follow` reopens it.
  if (process.stdin.isTTY) {
    const { runPicker } = await import('../ui/picker/run.js');
    const r = await runPicker('Last step: pick your leagues and teams. Type a team name to find it.');
    if (!r?.saved) {
      const following = r && r.settings.leagues.length + r.settings.teams.length > 0;
      console.log(following
        ? 'Keeping what you follow. Change it any time: claudial follow'
        : 'You can pick your teams any time: claudial follow');
    }
  }
}
