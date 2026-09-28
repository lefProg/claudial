import { installStatusline, type Conflict } from './settings.js';
import { installCursorStatusline } from './cursor.js';
import { appendAlias } from './shellrc.js';
import type { Shell } from './detect.js';
import type { SetupOptions } from './flags.js';

export interface ApplyContext {
  settingsPath: string;
  cursorPath: string;
  rcPath: string;
  shell: Shell;
  command: string;
  conflict: Conflict;
}

export interface ApplyReport {
  statuslineWritten: boolean;
  statuslineBackedUp: boolean;
  statuslineWrapped: boolean;
  cursorWritten: boolean;
  cursorBackedUp: boolean;
  cursorWrapped: boolean;
  aliasAppended: boolean;
}

export function applySetup(opts: SetupOptions, ctx: ApplyContext): ApplyReport {
  const report: ApplyReport = {
    statuslineWritten: false, statuslineBackedUp: false, statuslineWrapped: false,
    cursorWritten: false, cursorBackedUp: false, cursorWrapped: false, aliasAppended: false,
  };

  if (opts.statusline) {
    const r = installStatusline(ctx.settingsPath, ctx.command, ctx.conflict);
    report.statuslineWritten = r.written;
    report.statuslineBackedUp = r.backedUp;
    report.statuslineWrapped = r.wrapped;
  }
  if (opts.cursor) {
    const r = installCursorStatusline(ctx.cursorPath, ctx.command);
    report.cursorWritten = r.written;
    report.cursorBackedUp = r.backedUp;
    report.cursorWrapped = r.wrapped;
  }
  if (opts.tmux) {
    report.aliasAppended = appendAlias(ctx.rcPath, ctx.shell).appended;
  }
  return report;
}
