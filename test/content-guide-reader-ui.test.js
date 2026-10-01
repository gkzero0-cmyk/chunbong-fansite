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

test('posts and sources can be inspected inside the fan site before opening the original',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  const loader=read('mobile-runtime-loader.js');
  assert.match(js,/data-archive-source-reader/);
  assert.match(js,/archive-source-list a/);
  assert.match(js,/팬사이트 아카이브 자료/);
  assert.match(js,/원문 열기/);
  assert.match(css,/\.archive-source-reader/);
  assert.match(loader,/content-page-enhancements\.js\?v=1/);
});

test('content hero uses the supplied planning artwork without stretching mobile layout',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  assert.match(js,/archive-hero-art/);
  assert.match(js,/data:image\/webp;base64/);
  assert.match(css,/\.archive-hero-art/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*archive-hero-art/);
});
