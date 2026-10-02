'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');

test('Chunbong content hero uses the uploaded local asset',()=>{
  const html=read('chunbong-contents.html');
  assert.match(html,/\/assets\/chunbong-content-hero\.webp/);
  assert.doesNotMatch(html,/e_gen_restore\/c_scale/);
  assert.equal(fs.existsSync('assets/chunbong-content-hero.webp'),true);
});

test('header reserves lazy utility width without eager data loading',()=>{
  const init=read('theme-init.js');
  assert.match(init,/data-header-layout-reserve/);
  assert.match(init,/MutationObserver/);
  assert.match(init,/Math\.max\(0,238-used\)/);
});

test('operator html is routed through an authenticated server shell',()=>{
  const vercel=read('vercel.json');
  const api=read('api/survival-wiki.js');
  assert.match(vercel,/"source"\s*:\s*"\/operator\.html"/);
  assert.match(vercel,/mode=operator-page/);
  assert.match(api,/stripOperatorDashboard/);
  assert.match(api,/requireOwner/);
  assert.match(api,/Vary','Cookie/);
  assert.match(api,/operator-dashboard/);
});
