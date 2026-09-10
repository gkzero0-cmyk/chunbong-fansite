import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const page = fs.readFileSync(new URL('data.html', root), 'utf8');

assert.match(page, /class="page-hero data-hero"[\s\S]*class="data-hero-grid"/, 'data hero should use a two-column wrapper');
assert.match(page, /<img[^>]+class="data-hero-banner"[^>]+src="assets\/data-hero-banner\.jpg"/, 'data hero should show the supplied artwork on the right');
assert.match(page, /href="data-hero-banner\.css"/, 'data page should load dedicated hero styling');

const banner = fs.readFileSync(new URL('assets/data-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'data hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'data hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'data hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'data hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'data hero banner should have a complete JPEG ending');

console.log('data hero banner regression checks passed');
