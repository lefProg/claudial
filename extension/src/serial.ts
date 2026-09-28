// Run an async job one at a time without losing requests: a call that arrives
// while a run is in flight schedules exactly one more run after it, so the
// newest state is always fetched (a goal pushed mid-refresh is not dropped).

export function serial(job: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;
  const run = (): Promise<void> => {
    running = job().finally(() => {
      running = null;
      if (again) { again = false; void run(); }
    });
    return running;
  };
  return () => {
    if (!running) return run();
    again = true;
    return running.then(() => running ?? undefined);
  };
}
