import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

const corePages = ['index.html', 'schedule.html', 'notice.html', 'vod.html', 'clips.html', 'fanart.html'];
const pages = [...corePages, 'youtube.html', 'tarot.html'];
for (const page of pages) {
  assert.ok(fs.existsSync(new URL(page, root)), `${page} should exist`);
  const html = read(page);
  assert.ok(html.includes('styles.css'), `${page} should use shared styles`);
  assert.ok(html.includes('href="tarot.html"'), `${page} should link to TAROT`);
}
for (const page of corePages) {
  const html = read(page);
  for (const href of corePages) assert.ok(html.includes(href), `${page} should link to ${href}`);
}

const index = read('index.html');
assert.ok(!index.includes('id="schedule-grid"'), 'home should not contain the full schedule page');
assert.ok(!index.includes('id="notice-list"'), 'home should not contain the full notice page');
assert.ok(index.includes('춘봉 팬사이트'), 'home should identify the fan site');
assert.ok(index.includes('assets/chunbong-main.webp') || index.includes('data:image/webp;base64,'), 'home should use the uploaded character');
assert.ok(index.includes('07 / TAROT'), 'home should expose the TAROT portal card');
assert.ok(index.includes('타로 보기'), 'home should name the TAROT portal card');

const schedule = read('schedule.html');
assert.ok(schedule.includes('id="schedule-grid"'), 'schedule page should render schedule in-site');

const notice = read('notice.html');
assert.ok(notice.includes('id="notice-list"'), 'notice page should have an in-site notice list');
assert.ok(notice.includes('공지 내용을 팬사이트에서 바로 확인'), 'notice page should explain in-site reading');

const vod = read('vod.html');
assert.ok(vod.includes('id="vod-player"'), 'VOD page should have an embedded player');
assert.ok(vod.includes('id="vod-list"'), 'VOD page should have a selectable VOD list');

const clips = read('clips.html');
assert.ok(clips.includes('id="clip-player"'), 'clips page should have an embedded player');
assert.ok(clips.includes('id="clip-list"'), 'clips page should have a selectable clip list');

const fanart = read('fanart.html');
assert.ok(fanart.includes('id="fanart-grid"'), 'fanart page should have a gallery');
assert.ok(fanart.includes('id="fanart-modal"'), 'fanart page should have an in-site image modal');

const tarot = read('tarot.html');
assert.ok(tarot.includes('data-page="tarot"'), 'TAROT page should activate TAROT nav');
assert.ok(tarot.includes('id="tarot-deck"'), 'TAROT page should have a selectable deck');
assert.ok(tarot.includes('id="tarot-results"'), 'TAROT page should have a results area');

assert.ok(fs.existsSync(new URL('page.js', root)), 'shared page behavior should exist');
const pageScript = read('page.js');
for (const token of ['renderSchedulePage', 'renderNoticePage', 'renderVideoPage', 'renderFanartPage', 'setVideoPlayer', 'showModal']) {
  assert.ok(pageScript.includes(token), `page.js should include ${token}`);
}

const api = ['api/content.js','api/_shared.js','api/vod.js','api/notice.js','api/clips.js','api/fanart.js'].map(read).join('\n');
assert.ok(api.includes('embed'), 'content API should expose SOOP embed URLs');
assert.ok(api.includes('content'), 'content API should expose notice content for in-site reading');

console.log('multipage smoke test passed');