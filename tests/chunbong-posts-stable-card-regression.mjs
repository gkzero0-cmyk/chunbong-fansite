import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync(new URL('../chunbong-posts-runtime.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../chunbong-contents.html',import.meta.url),'utf8');

assert.match(runtime,/data-source-preview-toggle/);
assert.match(runtime,/data-post-title-toggle/,'post title itself must toggle the preview');
assert.match(runtime,/data-source-notice-detail/);
assert.match(runtime,/SESSION_PREFIX='chunbong:source-preview:v7:'/);
assert.match(runtime,/sourcePreview=1&previewVersion=5/);
assert.doesNotMatch(runtime,/insertAdjacentElement/,'post preview must not insert sibling cards');
assert.doesNotMatch(runtime,/setInterval\s*\(/,'post runtime must not add polling');
assert.match(runtime,/list\.dataset\.postsNormalized==='true'/,'normalization state must live on the freshly rendered list, not the persistent panel');
assert.doesNotMatch(runtime,/panel\.dataset\.postsNormalized==='true'/,'persistent panel state would break tab re-entry');
assert.match(runtime,/normalizeTimelinePanel/,'timeline source posts must use the stable card runtime');
assert.match(runtime,/normalizeSourcesPanel/,'source archive posts must use the stable card runtime');
assert.match(loader,/chunbong-posts-runtime\.js\?v=2/);
assert.doesNotMatch(loader,/content-page-enhancements\.js/,'legacy sibling-card runtime must remain disabled');
assert.match(html,/mobile-runtime-loader\.js\?v=2/,'content page must cache-bust the changed runtime loader');

console.log('chunbong stable post card regression passed');
