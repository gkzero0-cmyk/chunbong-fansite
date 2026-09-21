import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const protectedAssets=[
  ['assets/chunbong-main.webp',30000],
  ['assets/clips-hero-banner.jpg',120000],
  ['assets/data-hero-banner.jpg',180000],
  ['assets/fanart-hero-banner.jpg',150000],
  ['assets/history-hero-banner.jpg',400000],
  ['assets/notice-hero-banner.jpg',130000],
  ['assets/schedule-hero-banner.jpg',120000],
  ['assets/vod-hero-banner.jpg',120000],
  ['assets/youtube-hero-banner.jpg',140000],
  ['assets/minigames-hero-hq.webp',60000]
];

for(const [file,minBytes] of protectedAssets){
  const size=fs.statSync(new URL('../'+file,import.meta.url)).size;
  assert.ok(size>=minBytes,file+' appears aggressively recompressed: '+size+' bytes');
}
for(let i=1;i<=11;i++){
  const file='assets/chunbak/'+i+'.webp';
  const size=fs.statSync(new URL('../'+file,import.meta.url)).size;
  assert.ok(size>=300000,file+' quality guard failed: '+size+' bytes');
}

const index=read('index.html');
assert.match(index,/src="assets\/chunbong-main\.webp"/,'home hero must keep the original local image asset');
assert.doesNotMatch(index,/\/api\/image\?[^"' ]*(?:width|w)=/i,'home hero must not use a forced low-resolution image proxy');

const sw=read('service-worker.js');
assert.match(sw,/\['image','font'\]/,'images should use stale-while-revalidate caching without recompression');
assert.match(sw,/staleWhileRevalidate/,'image cache strategy missing');

console.log('image quality preservation regression passed');
