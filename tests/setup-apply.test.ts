import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applySetup, type ApplyContext } from '../src/setup/apply.js';

let dir: string;
let ctx: ApplyContext;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'claudial-apply-'));
  ctx = {
    settingsPath: join(dir, '.claude', 'settings.json'),
    rcPath: join(dir, '.zshrc'),
    shell: 'zsh',
    command: 'claudial --statusline',
    conflict: 'overwrite',
  };
});

describe('applySetup', () => {
  it('installs only the statusline when tmux is off', () => {
    const report = applySetup(
      { statusline: true, scope: 'global', tmux: false, shell: 'zsh', yes: true, interactive: false },
      ctx,
    );
    expect(report.statuslineWritten).toBe(true);
    expect(report.aliasAppended).toBe(false);
    expect(JSON.parse(readFileSync(ctx.settingsPath, 'utf8')).statusLine.command).toBe('claudial --statusline');
  });

  it('installs both statusline and tmux alias', () => {
    const report = applySetup(
      { statusline: true, scope: 'global', tmux: true, shell: 'zsh', yes: true, interactive: false },
      ctx,
    );
    expect(report.statuslineWritten).toBe(true);
    expect(report.aliasAppended).toBe(true);
    expect(readFileSync(ctx.rcPath, 'utf8')).toContain('claude-mundial');
  });

  it('does nothing when both toggles are off', () => {
    const report = applySetup(
      { statusline: false, scope: 'global', tmux: false, shell: 'zsh', yes: true, interactive: false },
      ctx,
    );
    expect(report.statuslineWritten).toBe(false);
    expect(report.aliasAppended).toBe(false);
    expect(existsSync(ctx.settingsPath)).toBe(false);
  });
});
