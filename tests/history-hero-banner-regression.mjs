import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const page = fs.readFileSync(new URL('history.html', root), 'utf8');

assert.match(page, /class="page-hero history-hero"[\s\S]*class="history-hero-grid"/, 'history hero should use a two-column wrapper');
assert.match(page, /<img[^>]+class="history-hero-banner"[^>]+src="assets\/history-hero-banner\.jpg"/, 'history hero should show the supplied artwork on the right');

const banner = fs.readFileSync(new URL('assets/history-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'history hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'history hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'history hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'history hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'history hero banner should have a complete JPEG ending');

console.log('history hero banner regression checks passed');
