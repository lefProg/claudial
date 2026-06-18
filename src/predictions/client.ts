import { mkdirSync, readFileSync, writeFileSync, renameSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Prediction } from './types.js';

const ENV = 'CLAUDIAL_PREDICTIONS_URL';
// Predictions only change every few hours server-side, so poll gently.
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Predictions are entirely opt-in: off unless the user points us at an API. */
export function predictionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env[ENV];
}

function cachePath(dir: string): string {
  return join(dir, 'predictions.json');
}

function readCache(file: string, now: number): Prediction[] | null {
  if (!existsSync(file)) return null;
  if (now - statSync(file).mtimeMs > CACHE_TTL_MS) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Prediction[];
  } catch {
    return null;
  }
}

function writeCache(file: string, preds: Prediction[]): void {
  const tmp = `${file}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(preds));
    renameSync(tmp, file);
  } catch {
    /* cache is best-effort */
  }
}

export interface FetchOpts {
  env?: NodeJS.ProcessEnv;
  now?: number;
  timeoutMs?: number;
  dir?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Fetch predictions, fail-silent. NEVER rejects — returns [] on any problem
 * (disabled, network error, bad JSON, timeout) so callers can drop predictions
 * and render fixtures exactly as before. Uses a disk cache to avoid hammering
 * the API on every statusline tick.
 */
export async function fetchPredictions(opts: FetchOpts = {}): Promise<Prediction[]> {
  const {
    env = process.env,
    now = Date.now(),
    timeoutMs = 2500,
    dir = join(tmpdir(), 'claudial-statusline'),
    fetchImpl = fetch,
  } = opts;

  const url = env[ENV];
  if (!url) return [];

  mkdirSync(dir, { recursive: true });
  const file = cachePath(dir);

  const cached = readCache(file, now);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetchImpl(url, { signal: controller.signal });
    if (!resp.ok) return cached ?? [];
    const data = (await resp.json()) as Prediction[];
    if (!Array.isArray(data)) return [];
    writeCache(file, data);
    return data;
  } catch {
    // Stale-but-present cache beats nothing; otherwise empty.
    return readCacheStale(file) ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/** Last-resort read ignoring TTL (used only when a live fetch fails). */
function readCacheStale(file: string): Prediction[] | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Prediction[];
  } catch {
    return null;
  }
}
