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
assert.match(loader,/const loadContentDetailExtras=\(\)=>\{/,'content detail extras must be isolated behind a loader function');
assert.match(loader,/document\.addEventListener\('chunbong:contents-detail-ready',loadContentDetailExtras,\{once:true\}\)/,'content detail extras must wait for the detail-ready event during in-page navigation');
assert.match(loader,/if\(\/\^\\\/contents\\\//,'direct nested detail routes must load detail extras without waiting for an event that may already have fired');
assert.match(loader,/new URLSearchParams\(location\.search\)\.get\('id'\)/,'direct query-string detail routes must load detail extras immediately');
const eagerExtras=['official-wiki-guide.js','content-page-enhancements.js','chunbong-posts-runtime.js'];
for(const name of eagerExtras){
  assert.ok(loader.includes(name),name+' must still be available for detail view');
}
const contentBlock=(loader.match(/if\(document\.body\?\.dataset\?\.page==='contents'\)\{([\s\S]*?)\n  \}/)||[])[1]||'';
assert.ok(contentBlock.includes("document.addEventListener('chunbong:contents-detail-ready'"),'content page must defer extras until detail activation');
assert.ok(!/loadContentDetailExtras\(\);\s*\n\s*\};\s*\n\s*loadContentDetailExtras\(\)/.test(contentBlock),'content list route must not unconditionally execute detail extras');
console.log('chunbong contents progressive render regression passed');
