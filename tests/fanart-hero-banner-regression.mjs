import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const fanart = fs.readFileSync(new URL('fanart.html', root), 'utf8');

assert.match(fanart, /href="fanart-hero-banner\.css(?:\?v=\d+)?"/, 'fanart page should load the dedicated hero banner stylesheet');
assert.match(fanart, /class="page-hero fanart-hero"[\s\S]*class="fanart-hero-grid"/, 'fanart hero should use a two-column wrapper');
assert.match(fanart, /<img[^>]+class="fanart-hero-banner"[^>]+src="assets\/fanart-hero-banner\.jpg"/, 'fanart hero should use the local high-quality artwork');
assert.match(fanart, /class="fanart-hero-banner"[^>]+width="960"[^>]+height="540"/, 'fanart hero should reserve its intrinsic layout size');

console.log('fanart hero banner regression checks passed');
