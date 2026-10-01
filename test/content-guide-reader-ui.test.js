'use strict';
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
const read=file=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

test('survival guide provides compact searchable navigation and section disclosure',()=>{
  const js=read('official-wiki-guide.js');
  const css=read('official-wiki-guide.css');
  assert.match(js,/data-official-guide-search/);
  assert.match(js,/data-official-guide-group/);
  assert.match(js,/data-official-section/);
  assert.match(js,/data-official-guide-prev/);
  assert.match(js,/data-official-guide-next/);
  assert.match(css,/\.official-guide-search/);
  assert.match(css,/\.official-guide-source-section/);
});

test('posts and sources load the captured body on demand inside the fan site',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  const api=read('api/content.js');
  const loader=read('mobile-runtime-loader.js');
  assert.match(js,/data-archive-source-reader/);
  assert.match(js,/archive-source-list a/);
  assert.match(js,/type=chunbong-content-source-preview/);
  assert.match(js,/preview\.body/);
  assert.match(js,/preview\.images/);
  assert.match(js,/원문 열기/);
  assert.match(api,/chunbong-content-source-preview/);
  assert.match(css,/\.archive-source-reader-body/);
  assert.match(loader,/content-page-enhancements\.js\?v=2/);
});

test('content hero uses a real static image in the right hero column instead of a data URI',()=>{
  const html=read('chunbong-contents.html');
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  assert.match(html,/archive-hero-copy[\s\S]*archive-hero-art/);
  assert.match(html,/assets\/content-planning-hero\.webp/);
  assert.match(html,/width="1000"[^>]*height="563"/);
  assert.doesNotMatch(js,/data:image\/webp;base64/);
  assert.match(css,/\.archive-hero-art/);
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*archive-hero-art/);
});
