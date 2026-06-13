import { describe, it, expect } from 'vitest';
import { detectShell, rcPathFor, isWindows } from '../src/setup/detect.js';

describe('detectShell', () => {
  it('reads zsh/bash/fish from $SHELL', () => {
    expect(detectShell({ SHELL: '/usr/bin/zsh' })).toBe('zsh');
    expect(detectShell({ SHELL: '/bin/bash' })).toBe('bash');
    expect(detectShell({ SHELL: '/usr/local/bin/fish' })).toBe('fish');
  });
  it('defaults to bash when unknown/absent', () => {
    expect(detectShell({})).toBe('bash');
    expect(detectShell({ SHELL: '/bin/dash' })).toBe('bash');
  });
});

describe('rcPathFor', () => {
  it('maps each shell to its rc file under home', () => {
    expect(rcPathFor('zsh', '/home/u')).toBe('/home/u/.zshrc');
    expect(rcPathFor('bash', '/home/u')).toBe('/home/u/.bashrc');
    expect(rcPathFor('fish', '/home/u')).toBe('/home/u/.config/fish/config.fish');
  });
});

describe('isWindows', () => {
  it('detects win32', () => {
    expect(isWindows('win32')).toBe(true);
    expect(isWindows('linux')).toBe(false);
  });
});
