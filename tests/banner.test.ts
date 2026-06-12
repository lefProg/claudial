import { describe, it, expect } from 'vitest';
import { GOAL_ART, VAR_ART, RED_CARD_ART, spacedCaps } from '../src/banner.js';

describe('banner', () => {
  it.each([
    ['GOAL_ART', GOAL_ART],
    ['VAR_ART', VAR_ART],
    ['RED_CARD_ART', RED_CARD_ART],
  ])('%s is rectangular (equal-width rows)', (_name, art) => {
    expect(new Set(art.map((l: string) => l.length)).size).toBe(1);
    expect(art.length).toBeGreaterThanOrEqual(5);
  });

  it('spacedCaps uppercases and letter-spaces, preserving accents', () => {
    expect(spacedCaps('Lukić')).toBe('L U K I Ć');
    expect(spacedCaps('Julián Álvarez')).toBe('J U L I Á N   Á L V A R E Z');
  });
});
