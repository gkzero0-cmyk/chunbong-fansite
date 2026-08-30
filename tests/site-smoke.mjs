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

const script = read('page.js');
for (const fn of ['renderSchedulePage','renderNoticePage','renderVideoPage','renderFanartPage']) {
  assert.ok(script.includes(fn), `missing ${fn}`);
}

console.log('site smoke test passed');
