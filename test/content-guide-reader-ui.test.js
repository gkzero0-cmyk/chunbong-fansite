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

test('posts and sources show body before attachments and do not stop at image-only browser captures',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  const manage=read('lib/chunbong-content-browser-import-manage.js');
  const loader=read('mobile-runtime-loader.js');
  assert.match(js,/data-archive-source-reader/);
  assert.match(js,/sourcePreview=1/);
  assert.match(js,/sessionStorage/);
  assert.doesNotMatch(js,/cache:'force-cache'/);
  assert.match(js,/container\.innerHTML=`[\s\S]*archive-source-reader-meta[\s\S]*archive-source-reader-article[\s\S]*archive-source-reader-attachments/);
  assert.match(manage,/mergeSourcePreviews/);
  assert.match(manage,/if\(captured\?\.body\)/);
  assert.match(manage,/publicSoopPreview/);
  assert.match(css,/\.archive-source-reader-body/);
  assert.match(loader,/content-page-enhancements\.js\?v=4/);
});

test('content hero is a right-column direct webp with critical CSS loaded before paint',()=>{
  const html=read('chunbong-contents.html');
  const css=read('content-page-enhancements.css');
  assert.match(html,/content-page-enhancements\.css\?v=4/);
  assert.match(html,/chunbong-content-planning-hero\.webp/);
  assert.match(html,/width="720"[^>]*height="405"/);
  assert.doesNotMatch(html,/content-planning-hero\.svg/);
  assert.match(css,/\.archive-hero-copy\{[^}]*grid-column:1/);
  assert.match(css,/\.archive-hero-art\{[^}]*grid-column:2/);
  assert.match(css,/aspect-ratio:16\/9/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*archive-hero-art/);
});
