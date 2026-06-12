export const GOAL_ART = [
  ' ██████   ██████   █████   ██      ',
  '██       ██    ██ ██   ██  ██      ',
  '██  ███  ██    ██ ███████  ██      ',
  '██    ██ ██    ██ ██   ██  ██      ',
  ' ██████   ██████  ██   ██  ███████ ',
];

export const VAR_ART = [
  '██     ██  █████  ██████  ',
  '██     ██ ██   ██ ██   ██ ',
  '██     ██ ███████ ██████  ',
  ' ██   ██  ██   ██ ██  ██  ',
  '  █████   ██   ██ ██   ██ ',
];

// the card itself, drawn tall
export const RED_CARD_ART = [
  '█████████',
  '█████████',
  '█████████',
  '█████████',
  '█████████',
  '█████████',
];

export function spacedCaps(s: string): string {
  return s
    .toUpperCase()
    .split(' ')
    .map((word) => word.split('').join(' '))
    .join('   ');
}
