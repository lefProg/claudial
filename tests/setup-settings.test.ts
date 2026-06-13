import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { statusLineBlock, mergeSettings, installStatusline } from '../src/setup/settings.js';

describe('statusLineBlock', () => {
  it('builds the command block with refreshInterval 3', () => {
    expect(statusLineBlock('claudial --statusline')).toEqual({
      type: 'command', command: 'claudial --statusline', refreshInterval: 1,
    });
  });
});

describe('mergeSettings', () => {
  const block = statusLineBlock('claudial --statusline');
  it('adds statusLine to settings without one, preserving other keys', () => {
    const { settings, changed } = mergeSettings({ theme: 'dark' }, block, 'overwrite');
    expect(changed).toBe(true);
    expect(settings.theme).toBe('dark');
    expect(settings.statusLine).toEqual(block);
  });
  it('keeps an existing statusLine when conflict=keep', () => {
    const existing = { statusLine: { type: 'command', command: 'other', refreshInterval: 9 } };
    const { settings, changed } = mergeSettings(existing, block, 'keep');
    expect(changed).toBe(false);
    expect(settings.statusLine.command).toBe('other');
  });
  it('reports no change when conflict=abort and one exists', () => {
    const existing = { statusLine: { type: 'command', command: 'other', refreshInterval: 9 } };
    const { changed } = mergeSettings(existing, block, 'abort');
    expect(changed).toBe(false);
  });
});

describe('installStatusline', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claudial-settings-')); });

  it('creates settings.json when missing', () => {
    const path = join(dir, '.claude', 'settings.json');
    const res = installStatusline(path, 'claudial --statusline', 'overwrite');
    expect(res.written).toBe(true);
    const json = JSON.parse(readFileSync(path, 'utf8'));
    expect(json.statusLine.command).toBe('claudial --statusline');
  });

  it('backs up and overwrites an existing file', () => {
    const path = join(dir, 'settings.json');
    writeFileSync(path, JSON.stringify({ theme: 'dark' }));
    const res = installStatusline(path, 'claudial --statusline', 'overwrite');
    expect(res.written).toBe(true);
    expect(res.backedUp).toBe(true);
    expect(existsSync(`${path}.bak`)).toBe(true);
    const json = JSON.parse(readFileSync(path, 'utf8'));
    expect(json.theme).toBe('dark');
    expect(json.statusLine.command).toBe('claudial --statusline');
  });
});
