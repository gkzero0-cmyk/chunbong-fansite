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
  const html=read('chunbong-contents.html');
  const js=read('chunbong-contents.js');
  assert.match(html,/data-archive-source-reader/);
  assert.match(js,/data-archive-source-reader-open/);
  assert.match(js,/팬사이트에서 보기/);
  assert.match(js,/원문 열기/);
});

test('content hero uses the supplied planning artwork without stretching mobile layout',()=>{
  const html=read('chunbong-contents.html');
  const css=read('chunbong-contents.css');
  assert.match(html,/archive-hero-art/);
  assert.match(html,/assets\/chunbong-contents\/content-planning-hero\.webp/);
  assert.match(css,/\.archive-hero-art/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*archive-hero-art/);
  assert.ok(fs.existsSync(path.join(process.cwd(),'assets/chunbong-contents/content-planning-hero.webp')));
});
