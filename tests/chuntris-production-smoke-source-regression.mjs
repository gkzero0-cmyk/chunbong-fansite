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
  'chuntris-mobile-controls'
]) {
  assert.ok(yml.includes(token), `production smoke must include ${token}`);
}

for (const [width, height] of [[1280,900],[1280,740],[900,800],[390,844],[360,800]]) {
  const viewport = new RegExp(`width\\s*:\\s*${width}\\s*,\\s*height\\s*:\\s*${height}`);
  assert.match(yml, viewport, `production smoke must cover ${width}x${height}`);
}

console.log('chuntris production smoke source regression passed');
