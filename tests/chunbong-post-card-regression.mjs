import fs from 'node:fs';
import assert from 'node:assert/strict';

const contents=fs.readFileSync(new URL('../chunbong-contents.js',import.meta.url),'utf8');
const enhancements=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');

assert.match(contents,/function renderPosts\(item\)\{[^\n]*normalizePostRows\(item\)/,'renderPosts must consume normalizePostRows(item)');
assert.match(contents,/archive-post-card/,'posts must render stable archive-post-card containers');
assert.match(contents,/data-archive-post-card/,'each post card must expose a stable card marker');
assert.match(contents,/data-post-toggle/,'each post card must expose a toggle button');
assert.match(contents,/data-source-url/,'each post card must carry its source URL');
assert.match(contents,/data-source-notice-detail/,'each post card must contain an in-card preview target');
assert.match(contents,/data-post-body/,'each post card must contain a stable collapsible body');
assert.match(contents,/data-source-external-link/,'external source links must be distinguishable from toggles');

assert.doesNotMatch(enhancements,/insertAdjacentElement\(\s*['"]afterend['"]/,'preview enhancement must not insert sibling post cards');
assert.doesNotMatch(enhancements,/document\.createElement\(\s*['"]article['"]\s*\)/,'preview enhancement must not manufacture a replacement article card');
assert.match(enhancements,/previewCache=new Map\(\)/,'memory preview cache must remain');
assert.match(enhancements,/SESSION_PREFIX='chunbong:source-preview:v7:'/,'session preview cache contract must remain during Task 2');
assert.match(enhancements,/sourcePreview=1&previewVersion=5/,'existing sourcePreview API contract must remain');
assert.match(enhancements,/data-source-external-link/,'external links must remain explicitly marked');
assert.match(enhancements,/data-post-toggle/,'enhancement must bind the existing post toggle');
assert.match(enhancements,/data-archive-post-card/,'enhancement must operate on existing post cards');

console.log('chunbong post card regression passed');
