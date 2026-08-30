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

assert.match(index, /hero-actions[\s\S]*youtube\.com\/@%EC%B6%98%EB%B4%89TV/i, 'home hero should have a YouTube shortcut button');
assert.match(index, /YouTube 바로가기/, 'home hero should label the YouTube shortcut clearly');

assert.ok(notice.includes('id="notice-image-modal"'), 'notice page should include an image lightbox dialog');
assert.ok(page.includes('NOTICE_REFRESH_MS'), 'notice page should define an automatic refresh interval');
assert.match(page, /setInterval\([\s\S]*renderNoticePage/, 'notice page should periodically refresh the latest notices');
assert.ok(page.includes('notice-state-label'), 'notice toggles should expose an explicit expand/collapse state label');
assert.ok(page.includes('setupNoticeImageZoom'), 'notice detail images should open in a lightbox');
assert.ok(styles.includes('.notice-image-modal'), 'notice image lightbox should be styled');

assert.ok(schedule.includes('id="schedule-grid"'), 'schedule page should retain an in-site schedule grid');
assert.ok(schedule.includes('id="schedule-official"'), 'schedule page should show the official SOOP schedule post in-site');
assert.ok(page.includes("loadNoticeDetail('203015477')"), 'schedule page should fetch the official SOOP schedule post');
assert.ok(page.includes('detail.images'), 'official schedule should render extracted schedule images');
assert.ok(!page.includes('schedule-official-embed-frame'), 'official schedule should not render fragile external iframes');
assert.ok(page.includes('schedule-official-fallback'), 'official schedule should show a useful fallback when only a dead embed remains');
assert.ok(content.includes('notionSchedule'), 'Notion calendar entries should be embedded for in-site schedule rendering');
for (const token of ['성하늘님 랜버워치','세구님 세바버','왁굳님 아르마3','조까치 수련회2']) {
  assert.ok(content.includes(token), `schedule snapshot should include ${token}`);
}
assert.ok(page.includes('Asia/Seoul'), 'scheduled datetimes should be rendered in Korea time');
assert.ok(styles.includes('.schedule-tag'), 'schedule tags should have visible styling');
assert.ok(styles.includes('.schedule-official-image'), 'official schedule images should have responsive styling');

console.log('notice + schedule enhancements regression test passed');
