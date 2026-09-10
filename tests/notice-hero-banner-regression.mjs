import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const notice = fs.readFileSync(new URL('notice.html', root), 'utf8');

assert.match(notice, /href="notice-hero-banner\.css"/, 'notice page should load the dedicated hero banner stylesheet');
assert.match(notice, /class="page-hero notice-hero"[\s\S]*class="notice-hero-grid"/, 'notice hero should use a two-column wrapper');
assert.match(notice, /<img[^>]+class="notice-hero-banner"[^>]+src="assets\/notice-hero-banner\.jpg"/, 'notice hero should show the supplied artwork on the right');

console.log('notice hero banner regression checks passed');
