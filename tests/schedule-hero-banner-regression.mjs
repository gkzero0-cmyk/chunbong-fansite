import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const schedule = fs.readFileSync(new URL('schedule.html', root), 'utf8');

assert.match(schedule, /href="schedule-hero-banner\.css"/, 'schedule page should load the dedicated hero banner stylesheet');
assert.match(schedule, /class="page-hero schedule-hero"[\s\S]*class="schedule-hero-grid"/, 'schedule hero should use a two-column wrapper');
assert.match(schedule, /<img[^>]+class="schedule-hero-banner"[^>]+src="https:\/\/res\.cloudinary\.com\//, 'schedule hero should show the supplied artwork on the right');

console.log('schedule hero banner regression checks passed');
