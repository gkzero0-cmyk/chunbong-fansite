import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../chunbong-posts-runtime.js',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');

assert.match(runtime,/타임라인/,'runtime should normalize eligible source rows in the timeline panel');
assert.match(runtime,/출처/,'runtime should normalize eligible source rows in the source/archive panel');
assert.match(runtime,/data-source-preview-trigger/,'post title/card should be the preview trigger');
assert.doesNotMatch(runtime,/data-source-preview-toggle/,'separate body expand button should be removed');
assert.match(runtime,/data-post-date/,'managed cards need an addressable date node');
assert.match(runtime,/preview\?\.date/,'preview metadata should be able to repair an unknown rendered date');
assert.match(runtime,/data-source-external-link/,'external source links must stay separate from title toggling');
assert.doesNotMatch(legacy,/insertAdjacentElement\(['"]afterend['"]/,'legacy enhancer must not create sibling preview cards');
assert.match(legacy,/ChunbongPostsRuntime|data-archive-source-card/,'legacy enhancer should defer managed source cards to the unified runtime');
assert.match(loader,/chunbong-posts-runtime\.js\?v=2/,'changed source-card runtime must be cache-busted');

console.log('chunbong unified source card regression passed');
