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

test('posts and sources reuse the fan-site notice card, preserve official SOOP body media, and keep the external source link external',()=>{
  const js=read('content-page-enhancements.js');
  const css=read('content-page-enhancements.css');
  const manage=read('lib/chunbong-content-browser-import-manage.js');
  const loader=read('mobile-runtime-loader.js');
  assert.doesNotMatch(js,/createElement\(['"]dialog['"]\)/);
  assert.match(js,/notice-card/);
  assert.match(js,/notice-toggle/);
  assert.match(js,/notice-index/);
  assert.match(js,/notice-main/);
  assert.match(js,/notice-action/);
  assert.match(js,/notice-state-label/);
  assert.match(js,/notice-chevron/);
  assert.match(js,/notice-body open/);
  assert.match(js,/notice-detail/);
  assert.match(js,/notice-content/);
  assert.match(js,/sourcePreview=1/);
  assert.match(js,/previewVersion=5/);
  assert.match(js,/source-preview:v7/);
  assert.match(js,/sessionStorage/);
  assert.doesNotMatch(js,/cache:'force-cache'/);
  assert.match(js,/preview\?\.html/);
  assert.match(js,/data-source-external-link/);
  assert.match(js,/matches\?\.\('\[data-source-external-link\]'\)/);
  assert.match(manage,/extractOfficialSoopImages/);
  assert.match(manage,/html:String\(detail\?\.html/);
  assert.match(manage,/const authoritativeImages=publicPreview\?\.body\?publicPreview\.images:null/);
  assert.match(manage,/looksLikeContaminatedSoopCapture/);
  assert.match(manage,/sanitizeCapturedSoopBody/);
  assert.match(css,/\.archive-source-notice/);
  assert.match(css,/\.archive-source-notice-html/);
  assert.doesNotMatch(css,/\.archive-source-reader(?:\{|::)/);
  assert.match(loader,/content-page-enhancements\.js\?v=7/);
});

test('content hero shares the site hero contract, uses the supplied full-resolution artwork, and nested routes resolve from root',()=>{
  const html=read('chunbong-contents.html');
  const css=read('content-page-enhancements.css');
  assert.match(html,/<base href="\/">/);
  assert.match(html,/<section class="page-hero archive-hero">/);
  assert.match(html,/content-page-enhancements\.css\?v=6/);
  assert.match(html,/\/assets\/chunbong-content-hero-20261002\.webp/);
  assert.match(html,/width="1672"[^>]*height="941"/);
  assert.doesNotMatch(html,/e_gen_restore\/c_scale/);
  assert.doesNotMatch(html,/content-planning-hero\.svg/);
  assert.match(css,/\.archive-hero \.archive-hero-inner\{[^}]*grid-template-columns:minmax\(0,\.82fr\) minmax\(420px,1fr\)/);
  assert.match(css,/\.archive-hero-copy h1\{[^}]*84px/);
  assert.match(css,/\.archive-hero-art\{[^}]*grid-column:2/);
  assert.match(css,/aspect-ratio:16\/9/);
});