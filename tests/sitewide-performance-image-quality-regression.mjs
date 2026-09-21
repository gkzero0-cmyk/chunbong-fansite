import assert from 'node:assert/strict';
import fs from 'node:fs';

const improvements=fs.readFileSync(new URL('../site-improvements.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const appShell=sw.slice(sw.indexOf('const APP_SHELL'),sw.indexOf('];',sw.indexOf('const APP_SHELL'))+2);
const mobile=fs.readFileSync(new URL('../mobile-site.css',import.meta.url),'utf8');

assert.match(improvements,/optimizeImageLoading/,'image loading optimizer missing');
assert.match(improvements,/img\.loading='lazy'/,'noncritical images should lazy-load');
assert.match(improvements,/img\.decoding='async'/,'images should decode asynchronously');
assert.match(improvements,/fetchpriority.*high/,'critical high-priority images must be preserved');
assert.doesNotMatch(improvements,/quality\s*=|toDataURL|canvas|getImageData|createImageBitmap/,'image optimizer must not recompress or raster-transform images');

for(const heavy of ['/tarot.html','/data.html','/vod.html','/clips.html','/youtube.html','/fanart.html']){
  assert.ok(!appShell.includes("'"+heavy+"'"),'heavy feature should not be install-precached: '+heavy);
}
assert.match(sw,/staleWhileRevalidate/,'full-quality visual runtime cache missing');
assert.match(sw,/\['image','font'\]/,'image/font runtime cache route missing');
assert.match(mobile,/floating-layer collision guard/,'mobile overlay collision guard missing');
assert.match(mobile,/pwa-app-more-open[\s\S]*video-viewer\.is-mobile-mini/,'More sheet should suppress floating mini player');

console.log('sitewide performance and image-quality-safe loading regression passed');
