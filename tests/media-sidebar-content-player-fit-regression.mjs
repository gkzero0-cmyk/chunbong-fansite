import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

for (const file of ['vod.html', 'clips.html', 'youtube.html']) {
  const html = read(file);
  assert.match(html, /class="media-sidebar"/, `${file} must render the media navigation inside the right sidebar`);
  const sidebar = html.match(/<aside class="media-sidebar"[\s\S]*?<\/aside>/)?.[0] || '';
  assert.match(sidebar, /class="media-local-nav"/, `${file} sidebar must contain the local media navigation`);
  assert.match(sidebar, />다시보기</, `${file} sidebar must link to replay`);
  assert.match(sidebar, />핫클립</, `${file} sidebar must link to clips`);
  assert.match(sidebar, />유튜브</, `${file} sidebar must link to YouTube`);
  assert.match(sidebar, /class="video-list"/, `${file} sidebar must contain the selectable video list`);
}

const layoutCss = read('media-video-layout.css');
assert.match(layoutCss, /\.media-sidebar\s*\{[^}]*position:sticky/s, 'desktop media sidebar must stay fixed while the viewer remains on the left');
assert.match(layoutCss, /grid-template-columns:minmax\(0,1fr\)\s+minmax\(320px,380px\)/, 'desktop media layout must reserve a bounded right sidebar');
assert.match(layoutCss, /@media\s*\(max-width:900px\)[\s\S]*\.media-sidebar\s*\{[^}]*position:static/s, 'mobile media sidebar must return to normal document flow');

const playerCss = read('content-media-player.css');
assert.match(playerCss, /\.archive-media-workspace\s*\{[^}]*max-width:920px/s, 'content player workspace must be bounded on desktop');
assert.match(playerCss, /\.archive-media-workspace-stage\s*\{[^}]*aspect-ratio:16\/9/s, 'content player stage must preserve 16:9 without relying on an oversized iframe');
assert.match(playerCss, /\.archive-media-workspace iframe\s*\{[^}]*height:100%/s, 'content iframe must fit the bounded stage height');
assert.match(playerCss, /@media\s*\(max-width:900px\)[\s\S]*\.archive-media-workspace\s*\{[^}]*max-width:none/s, 'content player must use the available width on small screens');

console.log('media sidebar + content player fit regression test passed');
