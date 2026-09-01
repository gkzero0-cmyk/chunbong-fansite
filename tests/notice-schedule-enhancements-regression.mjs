import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const index = read('index.html');
const notice = read('notice.html');
const schedule = read('schedule.html');
const content = read('content.js');
const page = read('page.js');
const styles = read('styles.css');
const liveFixes = read('live-fixes.js');

assert.match(index, /hero-actions[\s\S]*youtube\.com\/@%EC%B6%98%EB%B4%89TV/i, 'home hero should have a YouTube shortcut button');
assert.match(index, /YouTube 바로가기/, 'home hero should label the YouTube shortcut clearly');

assert.ok(notice.includes('id="notice-image-modal"'), 'notice page should include an image lightbox dialog');
assert.ok(page.includes('NOTICE_REFRESH_MS'), 'notice page should define an automatic refresh interval');
assert.match(page, /setInterval\([\s\S]*renderNoticePage/, 'notice page should periodically refresh the latest notices');
assert.ok(page.includes('notice-state-label'), 'notice toggles should expose an explicit expand/collapse state label');
assert.ok(page.includes('setupNoticeImageZoom'), 'notice detail images should open in a lightbox');
assert.ok(styles.includes('.notice-image-modal'), 'notice image lightbox should be styled');

assert.ok(schedule.includes('id="schedule-grid"'), 'schedule page should retain an in-site schedule grid');
assert.ok(!schedule.includes('id="schedule-official"'), 'removed official schedule section must not return');
assert.ok(!page.includes("loadNoticeDetail('203015477')"), 'page runtime must not recreate the removed official schedule section');
assert.ok(!schedule.includes('schedule-runtime.js'), 'schedule page must not load the obsolete official schedule snapshot runtime');
assert.ok(liveFixes.includes('/api/content?type=schedule'), 'schedule page should refresh live Notion calendar data through the in-site runtime');
assert.ok(!liveFixes.includes('data-official-snapshot'), 'live schedule override must not recreate the removed official snapshot');
assert.ok(content.includes('notionSchedule'), 'Notion calendar fallback entries should remain available for in-site schedule rendering');
assert.ok(page.includes('Asia/Seoul'), 'scheduled datetimes should be rendered in Korea time');
assert.ok(styles.includes('.schedule-tag'), 'schedule tags should have visible styling');

console.log('notice + live in-site schedule enhancements regression test passed');
