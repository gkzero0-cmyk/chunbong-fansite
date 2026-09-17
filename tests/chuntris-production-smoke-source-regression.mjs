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
  'chuntris-immersive.css',
  'chuntris.js',
  'api/content.js',
  'lib/chuntris-ranking-api.js',
  'assets/chuntris/**',
  'playwright@1.55.0',
  'https://chunbong-fansite.vercel.app',
  '/api/content?type=chuntris-ranking&mode=classic',
  '#chuntris-start-view',
  '#chuntris-play-view',
  '.chuntris-ranking-rail',
  '.chuntris-help-rail',
  '#chuntris-mode-classic',
  '#chuntris-utility-ranking',
  '#chuntris-harddrop-fx',
  '#chuntris-line-fx .chuntris-line-flash',
  'positional-impact-effects-v1',
  'CLEAR_SOUNDS',
  'invalid_nickname'
]) {
  assert.ok(yml.includes(token), `production smoke must include ${token}`);
}

for (const [width, height] of [[1440,900],[1024,768],[390,844]]) {
  const viewport = new RegExp(`width\\s*:\\s*${width}\\s*,\\s*height\\s*:\\s*${height}`);
  assert.match(yml, viewport, `production smoke must cover ${width}x${height}`);
}

for (const stale of [
  'grid-template-areas:"ranking left board right help"',
  'assertWideDesktopArrangement'
]) {
  assert.equal(yml.includes(stale), false, `production smoke must not depend on legacy layout token: ${stale}`);
}

console.log('chuntris production smoke source regression passed');
