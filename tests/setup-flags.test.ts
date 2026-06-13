import { describe, it, expect } from 'vitest';
import { parseFlags } from '../src/setup/flags.js';

describe('parseFlags', () => {
  it('is interactive when no actionable flags are given', () => {
    expect(parseFlags([]).interactive).toBe(true);
  });
  it('parses a full non-interactive invocation', () => {
    const o = parseFlags(['--statusline', '--project', '--tmux', '--shell', 'zsh', '--yes']);
    expect(o).toMatchObject({
      statusline: true, scope: 'project', tmux: true, shell: 'zsh', yes: true, interactive: false,
    });
  });
  it('defaults scope to global', () => {
    expect(parseFlags(['--statusline']).scope).toBe('global');
  });
  it('ignores an invalid --shell value (left null)', () => {
    expect(parseFlags(['--tmux', '--shell', 'nonsense']).shell).toBeNull();
  });
});
