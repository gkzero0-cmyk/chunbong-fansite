import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const ui=read('chunbong-contents.js');
const loader=read('mobile-runtime-loader.js');
assert.match(ui,/INITIAL_ARCHIVE_RENDER\s*=\s*12/,'archive initial batch must stay at twelve cards');
assert.match(ui,/ARCHIVE_RENDER_CHUNK\s*=\s*12/,'archive continuation chunks must stay at twelve cards');
assert.match(ui,/renderGeneration|generationToken|renderToken/,'archive chunks need a generation guard');
assert.match(ui,/requestIdleCallback|ChunbongIdle/,'remaining archive cards must continue during idle time');
assert.match(ui,/ChunbongCache\?\.peek|ChunbongCache\.peek/,'archive should render cached list before network refresh');
assert.match(ui,/chunbong:contents-detail-ready/,'detail render must publish a ready event');
const eagerExtras=['official-wiki-guide.js','content-page-enhancements.js','chunbong-posts-runtime.js'];
for(const name of eagerExtras){
  const beforeReady=loader.split('chunbong:contents-detail-ready')[0];
  assert.ok(!beforeReady.includes(name),name+' must not load before detail-ready');
  assert.ok(loader.includes(name),name+' must still be available for detail view');
}
console.log('chunbong contents progressive render regression passed');
