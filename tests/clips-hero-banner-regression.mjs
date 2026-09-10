import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const clips = fs.readFileSync(new URL('clips.html', root), 'utf8');

assert.match(clips, /href="clips-hero-banner\.css"/, 'clips page should load the dedicated hero banner stylesheet');
assert.match(clips, /class="page-hero clips-hero"[\s\S]*class="clips-hero-grid"/, 'clips hero should use a two-column wrapper');
assert.match(clips, /<img[^>]+class="clips-hero-banner"[^>]+src="assets\/clips-hero-banner\.jpg"/, 'clips hero should show the supplied artwork on the right');

const banner = fs.readFileSync(new URL('assets/clips-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'clips hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'clips hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'clips hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'clips hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'clips hero banner should have a complete JPEG ending');

console.log('clips hero banner regression checks passed');
