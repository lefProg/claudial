import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// This device's identity for the claudial server: a random UUID made once and
// kept in ~/.config/claudial/device-id. It is the only credential; there are no
// accounts. Deleting the file makes the server see a brand-new device.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'claudial');
}

/** Read the device id, creating it (mode 0600) on first use. */
export function deviceId(dir: string = configDir()): string {
  const file = join(dir, 'device-id');
  if (existsSync(file)) {
    const id = readFileSync(file, 'utf8').trim();
    if (UUID.test(id)) return id;
  }
  mkdirSync(dir, { recursive: true });
  const id = randomUUID();
  writeFileSync(file, `${id}\n`, { mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* best effort */ }
  return id;
}
