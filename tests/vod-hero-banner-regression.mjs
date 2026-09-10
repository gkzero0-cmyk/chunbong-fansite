import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const vod = fs.readFileSync(new URL('vod.html', root), 'utf8');

assert.match(vod, /href="vod-hero-banner\.css"/, 'vod page should load the dedicated hero banner stylesheet');
assert.match(vod, /class="page-hero vod-hero"[\s\S]*class="vod-hero-grid"/, 'vod hero should use a two-column wrapper');
assert.match(vod, /<img[^>]+class="vod-hero-banner"[^>]+src="assets\/vod-hero-banner\.jpg"/, 'vod hero should show the supplied artwork on the right');

const banner = fs.readFileSync(new URL('assets/vod-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'vod hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'vod hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'vod hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'vod hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'vod hero banner should have a complete JPEG ending');

console.log('vod hero banner regression checks passed');
