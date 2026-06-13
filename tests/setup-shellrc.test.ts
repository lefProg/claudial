import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aliasLine, hasAlias, appendAlias } from '../src/setup/shellrc.js';

describe('aliasLine', () => {
  it('uses POSIX escaping for zsh/bash', () => {
    const l = aliasLine('zsh');
    expect(l).toContain('alias claude-mundial=');
    expect(l).toContain("claudial --ticker");
    expect(l).toContain('\\;');
  });
  it('uses fish syntax for fish', () => {
    const l = aliasLine('fish');
    expect(l).toContain('alias claude-mundial ');
    expect(l).not.toContain('\\;');
  });
});

describe('hasAlias', () => {
  it('detects an existing claude-mundial alias', () => {
    expect(hasAlias('foo\nalias claude-mundial=...\nbar')).toBe(true);
    expect(hasAlias('nothing here')).toBe(false);
  });
});

describe('appendAlias', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'claudial-rc-')); });

  it('appends to a fresh rc file', () => {
    const rc = join(dir, '.zshrc');
    const res = appendAlias(rc, 'zsh');
    expect(res.appended).toBe(true);
    expect(hasAlias(readFileSync(rc, 'utf8'))).toBe(true);
  });
  it('is idempotent', () => {
    const rc = join(dir, '.bashrc');
    writeFileSync(rc, '# existing\n');
    expect(appendAlias(rc, 'bash').appended).toBe(true);
    expect(appendAlias(rc, 'bash').appended).toBe(false);
    const content = readFileSync(rc, 'utf8');
    expect(content.match(/claude-mundial/g)?.length).toBe(1);
  });
});
