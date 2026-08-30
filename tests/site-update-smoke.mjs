import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');
const index = read('index.html');
const content = read('content.js');
const script = read('page.js');
const api = ['api/content.js','api/_shared.js','api/vod.js','api/notice.js','api/clips.js','api/fanart.js'].map(read).join('\n');
const allHtml = ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html'].map(read).join('\n');

assert.ok(fs.existsSync(new URL('assets/chunbong-main.webp', root)), 'uploaded main character image should exist');
assert.ok(index.includes('assets/chunbong-main.webp'), 'hero should use uploaded character image');
assert.ok(!allHtml.includes('춘동아리'), 'site should no longer mention 춘동아리');
assert.ok(index.includes('사자컴퍼니'), 'home should mention 사자컴퍼니');
assert.ok(allHtml.includes('https://saza-company.vercel.app/'), 'saza company should be linked');

for (const url of [
  'https://www.sooplive.com/station/chunbongtv/vod',
  'https://www.sooplive.com/station/chunbongtv/board/126448625',
  'https://www.sooplive.com/station/chunbongtv/catch',
  'https://www.sooplive.com/station/chunbongtv/vod/clip',
  'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I'
]) assert.ok(allHtml.includes(url) || content.includes(url), `missing requested source link ${url}`);

for (const type of ['vod','notice','clips','fanart']) {
  assert.ok(script.includes(`/api/content?type=${type}`), `${type} should load through content proxy`);
}
assert.ok(api.includes('/embed?showChat=false'), 'SOOP videos should expose an embed URL');
assert.ok(api.includes('content,'), 'notices should expose content for in-site reading');
assert.ok(read('fanart.html').includes('<dialog'), 'fanart should open in an in-site modal');

console.log('site update smoke test passed');
