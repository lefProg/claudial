import { installStatusline, type Conflict } from './settings.js';
import { appendAlias } from './shellrc.js';
import type { Shell } from './detect.js';
import type { SetupOptions } from './flags.js';

export interface ApplyContext {
  settingsPath: string;
  rcPath: string;
  shell: Shell;
  command: string;
  conflict: Conflict;
}

export interface ApplyReport {
  statuslineWritten: boolean;
  statuslineBackedUp: boolean;
  aliasAppended: boolean;
}

export function applySetup(opts: SetupOptions, ctx: ApplyContext): ApplyReport {
  const report: ApplyReport = { statuslineWritten: false, statuslineBackedUp: false, aliasAppended: false };

  if (opts.statusline) {
    const r = installStatusline(ctx.settingsPath, ctx.command, ctx.conflict);
    report.statuslineWritten = r.written;
    report.statuslineBackedUp = r.backedUp;
  }
  if (opts.tmux) {
    report.aliasAppended = appendAlias(ctx.rcPath, ctx.shell).appended;
  }
  return report;
}
