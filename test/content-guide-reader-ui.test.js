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

test('posts and sources load captured or public SOOP body text on demand inside the fan site',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  const manage=read('lib/chunbong-content-browser-import-manage.js');
  const loader=read('mobile-runtime-loader.js');
  assert.match(js,/data-archive-source-reader/);
  assert.match(js,/sourcePreview=1/);
  assert.match(js,/preview\?\.body/);
  assert.match(js,/preview\?\.images/);
  assert.match(js,/previewImageAllowed/);
  assert.match(js,/ImageLoading|imageloading/i);
  assert.match(js,/원문 열기/);
  assert.match(manage,/buildPublicSourcePreview/);
  assert.match(manage,/BROWSER_IMPORT_PREFIX/);
  assert.match(manage,/fetchNoticeDetail/);
  assert.match(css,/\.archive-source-reader-body/);
  assert.match(loader,/content-page-enhancements\.js\?v=3/);
});

test('content hero uses a cacheable static asset in a forced right hero column instead of a JS data URI',()=>{
  const html=read('chunbong-contents.html');
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  assert.match(html,/archive-hero-copy[\s\S]*archive-hero-art/);
  assert.match(html,/assets\/content-planning-hero\.svg/);
  assert.match(html,/width="480"[^>]*height="270"/);
  assert.doesNotMatch(js,/data:image\/webp;base64/);
  assert.match(css,/\.archive-hero \.archive-hero-inner\{[^}]*display:grid[^}]*grid-template-columns/);
  assert.match(css,/\.archive-hero-art/);
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*archive-hero-art/);
});
