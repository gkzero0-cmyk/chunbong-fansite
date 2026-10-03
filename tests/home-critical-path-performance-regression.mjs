import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const overview=read('home-overview.js');
const smart=read('home-smart-status.js');
const fortune=read('home-fortune-loader.js');
const html=read('index.html');

assert.match(overview,/ChunbongCache\?\.peek|ChunbongCache\.peek/,'home overview must inspect cached data before network refresh');
for(const key of ['home-overview:live','home-overview:schedule','home-overview:activity'])assert.ok(overview.includes(key),'missing stable cached-first key '+key);
assert.match(overview,/chunbong:home-live/,'home overview must publish the resolved live payload');
assert.match(smart,/chunbong:home-live/,'smart status must reuse the shared live payload');
assert.match(smart,/ChunbongCache\?\.peek|ChunbongCache\.peek/,'smart status should reuse cached live state before fetching');
assert.match(overview,/whenVisible\(statsRoot/,'stats must remain viewport-deferred');
assert.match(overview,/whenVisible\(archiveRoot/,'archive preview must remain viewport-deferred');
assert.doesNotMatch(fortune,/\bvoid\s+loadFortune\(\)\s*;?\s*$/m,'fortune runtime must not load unconditionally at startup');
const highPriority=(html.match(/fetchpriority="high"/g)||[]).length;
assert.equal(highPriority,1,'home should reserve high fetch priority for the hero image only');
console.log('home critical path performance regression passed');
