import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../chunbong-posts-runtime.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');
const legacy=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');

assert.match(runtime,/function\s+normalizeTimelinePanel\b/,'timeline SOOP posts should be normalized into stable cards');
assert.match(runtime,/function\s+normalizeSourcesPanel\b/,'source archive SOOP posts should be normalized into stable cards');
assert.match(runtime,/data-post-title-toggle/,'the post title itself should be the expand/collapse control');
assert.match(runtime,/data-post-meta/,'cards should expose metadata that can be updated from source preview');
assert.match(runtime,/preview\?\.date|preview\.date/,'preview-confirmed dates should update the card metadata');
assert.doesNotMatch(loader,/addScript\(['"]content-page-enhancements\.js/,'legacy sibling-card preview runtime must no longer load on content pages');
assert.match(loader,/chunbong-posts-runtime\.js\?v=2/,'new cross-tab runtime must be cache-busted');
assert.match(legacy,/archive-source-notice/,'legacy source remains in the repository only for compatibility, not as the active runtime');

console.log('chunbong cross-tab source cards regression passed');
