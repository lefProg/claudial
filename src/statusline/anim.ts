// A gentle "goal kick → net" animation for the idle (between-matches) status
// line. Claude Code repaints the status line on a timer, so one frame shows per
// repaint — the frame is chosen from wall-clock time so it advances at a steady
// rate regardless of how often the command happens to be invoked.

export const FRAME_MS = 1000;

const FRAMES = [
  '⚽·····🥅',
  '·⚽····🥅',
  '··⚽···🥅',
  '···⚽··🥅',
  '····⚽·🥅',
  '·····⚽🥅',
  '· G O A L! ·',
];

/** The goal-kick animation frame for time `now` (ms); loops continuously. */
export function goalKickFrame(now: number = Date.now()): string {
  return FRAMES[Math.floor(now / FRAME_MS) % FRAMES.length];
}
