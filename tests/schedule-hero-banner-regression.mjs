import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const schedule = fs.readFileSync(new URL('schedule.html', root), 'utf8');

assert.match(schedule, /href="schedule-hero-banner\.css"/, 'schedule page should load the dedicated hero banner stylesheet');
assert.match(schedule, /class="page-hero schedule-hero"[\s\S]*class="schedule-hero-grid"/, 'schedule hero should use a two-column wrapper');
assert.match(schedule, /<img[^>]+class="schedule-hero-banner"[^>]+src="assets\/schedule-hero-banner\.jpg"/, 'schedule hero should show the supplied artwork on the right');

const banner = fs.readFileSync(new URL('assets/schedule-hero-banner.jpg', root));
assert.ok(banner.length > 100_000, 'schedule hero banner should contain the full image payload');
assert.equal(banner[0], 0xff, 'schedule hero banner should be a JPEG');
assert.equal(banner[1], 0xd8, 'schedule hero banner should be a JPEG');
assert.equal(banner.at(-2), 0xff, 'schedule hero banner should have a complete JPEG ending');
assert.equal(banner.at(-1), 0xd9, 'schedule hero banner should have a complete JPEG ending');

console.log('schedule hero banner regression checks passed');
