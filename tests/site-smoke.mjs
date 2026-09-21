import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

for (const file of ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','styles.css','content.js','page.js','api/content.js']) {
  assert.ok(fs.existsSync(new URL(file, root)), `${file} should exist`);
}

const html = read('index.html');
for (const url of [
  'https://www.sooplive.com/station/chunbongtv',
  'https://cafe.naver.com/chunbongtv',
  'https://saza-company.vercel.app/'
]) assert.ok(html.includes(url), `missing official link ${url}`);

for (const page of ['schedule.html','notice.html','vod.html','clips.html','fanart.html']) {
  assert.ok(html.includes(page), `home should link to ${page}`);
}

const css = read('styles.css');
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /--orange:/);
assert.match(css, /@media\s*\(max-width:/);

const content = read('content.js');
assert.match(content, /CHUNBONG_CONTENT/);
assert.match(content, /schedule:/);
assert.match(content, /notices:/);

const script = [
  read('page.js'),
  read('page-schedule.js'),
  read('page-notice.js'),
  read('page-media.js'),
  read('page-fanart.js')
].join('\n');
for (const fn of ['renderSchedulePage','renderNoticePage','renderVideoPage','renderFanartPage']) {
  assert.ok(script.includes(fn), `missing ${fn}`);
}

console.log('site smoke test passed');


const homeOverview=read('home-overview.js');
const homeRefresh=read('home-refresh.css');
assert.match(html,/data-home-content-archive/,'home archive preview section missing');
assert.match(html,/data-home-content-list/,'home archive preview list missing');
assert.match(homeOverview,/get\('chunbong-contents'\)/,'home archive preview must request the public archive dataset');
assert.match(homeOverview,/data-home-content-list/,'home archive renderer hook missing');
assert.match(homeRefresh,/\.home-content-archive-grid/,'home archive responsive grid styles missing');
assert.match(homeRefresh,/\.home-content-card/,'home archive card styles missing');


const sitemap=read('sitemap.xml');
const changelog=read('changelog-data.js');
assert.match(sitemap,/chunbong-contents\.html/,'content archive should be discoverable in sitemap');
assert.match(changelog,/2026-09-22/,'latest archive work should be in changelog');
assert.match(changelog,/춘타클/,'ChunTaClass archive addition should be documented');
