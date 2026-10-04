import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
const contentsHtml=read('chunbong-contents.html');
const mediaPlayer=read('content-media-player.js');
const workspaceCss=read('media-video-layout.css');
const serviceWorker=read('service-worker.js');
const page=read('page.js');

assert.match(contentsHtml,/content-media-player\.js\?v=5[^>]*data-content-media-player-runtime/,'content detail must directly load the fitted shared media player workspace');
assert.match(mediaPlayer,/vod\.sooplive\.com/,'SOOP VOD .com hostname must be recognized');
assert.match(mediaPlayer,/vod\.sooplive\.co\.kr/,'SOOP VOD .co.kr hostname must be recognized');
assert.ok(mediaPlayer.includes('u.pathname.match(/^\\/player'),'SOOP player paths must be converted to embed URLs');
assert.match(mediaPlayer,/youtube-nocookie\.com\/embed/,'YouTube URLs must be embeddable');
for(const file of ['vod.html','clips.html','youtube.html']){
  const html=read(file);
  assert.match(html,/media-video-layout\.css\?v=4/,`${file} must load the fixed-sidebar stylesheet`);
  assert.match(html,/class="media-sidebar"/,`${file} must render a dedicated media sidebar`);
}
assert.match(workspaceCss,/\.media-sidebar\s*\{[\s\S]*?position:\s*sticky/,'desktop media sidebar must stay fixed');
assert.match(workspaceCss,/\.media-sidebar>\.video-list\s*\{[\s\S]*?overflow-y:\s*auto/,'catalogue entries must scroll inside the sidebar');
assert.match(workspaceCss,/overscroll-behavior:\s*contain/,'catalogue wheel scrolling must not drag the whole page');
assert.match(workspaceCss,/scrollbar-gutter:\s*stable/,'catalogue scrollbar must not shift card widths');
assert.match(serviceWorker,/FALLBACK_VERSION\s*=\s*['"]runtime-v37['"]/,'service worker cache generation must advance');
assert.match(page,/const fallback=['"]runtime-v37['"]/,'registration fallback must match the new cache generation');
console.log('media playback workspace regression passed');