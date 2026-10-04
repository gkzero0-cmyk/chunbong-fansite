'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.existsSync(path.join(root,file))?fs.readFileSync(path.join(root,file),'utf8'):'';

const contentsHtml=read('chunbong-contents.html');
const mediaPlayer=read('content-media-player.js');
const workspaceCss=read('media-video-layout.css');
const serviceWorker=read('service-worker.js');
const page=read('page.js');

test('content archive loads the inline media player directly on every detail route',()=>{
  assert.match(contentsHtml,/content-media-player\.js\?v=3[^>]*data-content-media-player-runtime/);
  assert.match(mediaPlayer,/archive-media-card\[data-inline-media-ready\]/);
  assert.match(mediaPlayer,/vod\.sooplive\.com\/player/);
  assert.match(mediaPlayer,/youtube-nocookie\.com\/embed/);
});

test('desktop video pages keep the catalogue fixed and scroll only inside the catalogue',()=>{
  for(const file of ['vod.html','clips.html','youtube.html']){
    assert.match(read(file),/media-video-layout\.css\?v=1/,`${file} must load the desktop media workspace stylesheet`);
  }
  assert.match(workspaceCss,/\.video-layout\s*>\s*\.video-list[\s\S]*position:\s*sticky/);
  assert.match(workspaceCss,/\.video-layout\s*>\s*\.video-list[\s\S]*overflow-y:\s*auto/);
  assert.match(workspaceCss,/overscroll-behavior:\s*contain/);
  assert.match(workspaceCss,/scrollbar-gutter:\s*stable/);
});

test('PWA fallback generation advances so old media runtime caches are discarded',()=>{
  assert.match(serviceWorker,/FALLBACK_VERSION\s*=\s*['"]runtime-v37['"]/);
  assert.match(page,/const fallback=['"]runtime-v37['"]/);
});
