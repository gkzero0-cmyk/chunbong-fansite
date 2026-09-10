import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const fanart = fs.readFileSync(new URL('fanart.html', root), 'utf8');

assert.match(fanart, /href="fanart-hero-banner\.css"/, 'fanart page should load the dedicated hero banner stylesheet');
assert.match(fanart, /class="page-hero fanart-hero"[\s\S]*class="fanart-hero-grid"/, 'fanart hero should use a two-column wrapper');
assert.match(fanart, /<img[^>]+class="fanart-hero-banner"[^>]+src="https:\/\/res\.cloudinary\.com\//, 'fanart hero should show the supplied artwork on the right');

console.log('fanart hero banner regression checks passed');
