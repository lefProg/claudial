import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installCursorStatusline, cursorConfigPath } from '../src/setup/cursor.js';

let dir: string; let file: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claudial-cursor-')); file = join(dir, 'cli-config.json'); });
const read = () => JSON.parse(readFileSync(file, 'utf8'));

describe('installCursorStatusline', () => {
  it('lives in ~/.cursor/cli-config.json', () => {
    expect(cursorConfigPath('/home/u')).toBe('/home/u/.cursor/cli-config.json');
  });
  it('creates the file with the claudial block', () => {
    const r = installCursorStatusline(file, 'claudial --statusline');
    expect(r).toEqual({ written: true, backedUp: false, wrapped: false });
    expect(read().statusLine).toEqual({ type: 'command', command: 'claudial --statusline', padding: 0, updateIntervalMs: 1000, timeoutMs: 3000 });
  });
  it('keeps other keys and backs up the old file', () => {
    writeFileSync(file, JSON.stringify({ editor: { vimMode: true } }));
    const r = installCursorStatusline(file, 'claudial --statusline');
    expect(r.backedUp).toBe(true);
    expect(read().editor).toEqual({ vimMode: true });
    expect(existsSync(`${file}.bak`)).toBe(true);
  });
  it("wraps someone else's status line instead of dropping it", () => {
    writeFileSync(file, JSON.stringify({ statusLine: { type: 'command', command: '~/.cursor/mine.sh' } }));
    const r = installCursorStatusline(file, 'claudial --statusline');
    expect(r.wrapped).toBe(true);
    expect(read().statusLine.command).toBe("claudial --statusline --wrap '~/.cursor/mine.sh'");
  });
  it('is a no-op when the same block is already there', () => {
    installCursorStatusline(file, 'claudial --statusline');
    expect(installCursorStatusline(file, 'claudial --statusline').written).toBe(false);
  });
  it('invalid JSON is backed up and replaced', () => {
    writeFileSync(file, '{ not json');
    const r = installCursorStatusline(file, 'claudial --statusline');
    expect(r).toMatchObject({ written: true, backedUp: true });
    expect(readFileSync(`${file}.bak`, 'utf8')).toBe('{ not json');
    expect(read().statusLine.command).toBe('claudial --statusline');
  });
});
