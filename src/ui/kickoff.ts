// Kickoff times as text. Plain functions with no UI imports, so the status line
// and the editor extension can use them without pulling in Ink.

export function formatKickoff(ts: number, now: number = Date.now()): string {
  const d = new Date(ts * 1000);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const sameDay = d.toDateString() === new Date(now).toDateString();
  if (sameDay) return time;
  // Within the week a weekday is enough; further out (fixtures reach ~3 weeks) add the date.
  const soon = ts * 1000 - now < 6 * 86_400_000;
  const day = d.toLocaleDateString(undefined, soon ? { weekday: 'short' } : { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} ${time}`;
}

/** The kickoff padded to `width` (default: fits the longest date format), always followed by a space. */
export function kickoffColumn(ts: number, now: number = Date.now(), width: number = 22): string {
  const k = formatKickoff(ts, now);
  return k.length >= width - 1 ? `${k} ` : k.padEnd(width);
}

/** One column width for a list of kickoffs: its longest date plus a two-space gap. */
export function kickoffWidth(timestamps: number[], now: number = Date.now()): number {
  if (timestamps.length === 0) return 22;
  return Math.max(...timestamps.map((ts) => formatKickoff(ts, now).length)) + 2;
}
