import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const page = fs.readFileSync(new URL('youtube.html', root), 'utf8');

assert.match(page, /href="youtube-hero-banner\.css"/, 'youtube page should load the dedicated hero banner stylesheet');
assert.match(page, /class="page-hero youtube-hero"[\s\S]*class="youtube-hero-grid"/, 'youtube hero should use a two-column wrapper');
assert.match(page, /<img[^>]+class="youtube-hero-banner"[^>]+src="assets\/youtube-hero-banner\.jpg"/, 'youtube hero should show the supplied artwork on the right');

const banner = fs.readFileSync(new URL('assets/youtube-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'youtube hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'youtube hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'youtube hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'youtube hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'youtube hero banner should have a complete JPEG ending');

console.log('youtube hero banner regression checks passed');
