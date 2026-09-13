import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflowUrl = new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url);
assert.ok(fs.existsSync(workflowUrl), 'Chuntris production smoke workflow must exist');
const yml = fs.readFileSync(workflowUrl, 'utf8');

for (const token of [
  'chuntris.html',
  'chuntris-engine.js',
  'chuntris-audio.js',
  'chuntris.js',
  'assets/chuntris/**',
  'assets/chuntris/reactions.webp',
  'playwright@1.55.0',
  'chunbong-fansite.vercel.app/chuntris.html',
  'data-chuntris-mode',
  'chuntris-start',
  'chuntris-mobile-controls'
]) {
  assert.ok(yml.includes(token), `production smoke must include ${token}`);
}

console.log('chuntris production smoke source regression passed');
