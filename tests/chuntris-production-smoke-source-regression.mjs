import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflowUrl = new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url);
assert.ok(fs.existsSync(workflowUrl), 'Chuntris production smoke workflow must exist');
const yml = fs.readFileSync(workflowUrl, 'utf8');

for (const token of [
  'chuntris.html',
  'chuntris-engine.js',
  'chuntris-audio.js',
  'chuntris-ranking-core.js',
  'chuntris.js',
  'assets/chuntris/**',
  'assets/chuntris/reactions.webp',
  'playwright@1.55.0',
  'chunbong-fansite.vercel.app/chuntris.html',
  '/api/chuntris-ranking?mode=classic',
  '#chuntris-nickname',
  '.chuntris-ranking-rail',
  '.chuntris-help-rail',
  'data-chuntris-mode',
  'chuntris-start',
  'chuntris-mobile-controls',
  'width: 1280, height: 900',
  'width: 1280, height: 740',
  'width: 900, height: 800',
  'width: 390, height: 844',
  'width: 360, height: 800'
]) {
  assert.ok(yml.includes(token), `production smoke must include ${token}`);
}

console.log('chuntris production smoke source regression passed');
