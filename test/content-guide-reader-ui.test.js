'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('guide reader groups official wiki navigation and keeps source fidelity',()=>{
  const js=read('official-wiki-guide.js');
  assert.match(js,/guide-nav-search/);
  assert.match(js,/guide-nav-group/);
  assert.match(js,/guide-document-section/);
  assert.match(js,/guide-document-pager/);
  assert.match(js,/sourceLabel/);
});

test('guide reader styles compact navigation and collapsible document sections',()=>{
  const css=read('official-wiki-guide.css');
  assert.match(css,/\.guide-nav-search/);
  assert.match(css,/\.guide-nav-group/);
  assert.match(css,/\.guide-document-section/);
  assert.match(css,/\.guide-document-pager/);
});

test('content post reader reuses fan-site notice UI and stays lazy',()=>{
  const runtime=read('content-page-enhancements.js');
  const manage=read('lib/chunbong-content-browser-import-manage.js');
  const css=read('content-page-enhancements.css');
  const loader=read('mobile-runtime-loader.js');
  assert.match(runtime,/notice-card/);
  assert.match(runtime,/notice-toggle/);
  assert.match(runtime,/notice-body/);
  assert.match(runtime,/notice-content/);
  assert.match(runtime,/sourcePreview=1/);
  assert.match(runtime,/sessionStorage/);
  assert.match(manage,/mergeSourcePreviews/);
  assert.match(manage,/if\(captured\?\.body\)/);
  assert.match(manage,/publicSoopPreview/);
  assert.match(css,/\.archive-source-notice/);
  assert.doesNotMatch(css,/\.archive-source-reader(?:\{|::)/);
  assert.match(loader,/content-page-enhancements\.js\?v=5/);
});

test('content hero shares the site hero contract, uses supplied artwork, and nested routes resolve from root',()=>{
  const html=read('chunbong-contents.html');
  const css=read('content-page-enhancements.css');
  assert.match(html,/<base href="\/">/);
  assert.match(html,/<section class="page-hero archive-hero">/);
  assert.match(html,/content-page-enhancements\.css\?v=5/);
  assert.match(html,/\/assets\/chunbong-content-hero-hq\.avif/);
  assert.match(html,/width="1120"[^>]*height="630"/);
  assert.doesNotMatch(html,/e_gen_restore/);
  assert.doesNotMatch(html,/content-planning-hero\.svg/);
  assert.match(css,/\.archive-hero \.archive-hero-inner\{[^}]*grid-template-columns:minmax\(0,\.82fr\) minmax\(420px,1fr\)/);
  assert.match(css,/\.archive-hero-copy h1\{[^}]*84px/);
  assert.match(css,/\.archive-hero-art\{[^}]*grid-column:2/);
  assert.match(css,/aspect-ratio:16\/9/);
});
