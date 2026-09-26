// Runs before `npm publish` (prepublishOnly). Refuses a release that would ship a
// client unable to reach any server: DEFAULT_API_URL must be the deployed origin,
// over HTTPS, not localhost (final review N4).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/api/backend.ts', import.meta.url), 'utf8');
const url = /export const DEFAULT_API_URL = '([^']*)'/.exec(src)?.[1];
const problems = [];
if (!url) problems.push('DEFAULT_API_URL not found in src/api/backend.ts');
else {
  if (/localhost|127\.0\.0\.1/.test(url)) problems.push(`DEFAULT_API_URL is ${url}: set it to the deployed server`);
  if (!url.startsWith('https://')) problems.push(`DEFAULT_API_URL is ${url}: the device id is a credential, ship HTTPS`);
}
if (problems.length) {
  console.error(`release blocked:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`release check ok: DEFAULT_API_URL = ${url}`);
