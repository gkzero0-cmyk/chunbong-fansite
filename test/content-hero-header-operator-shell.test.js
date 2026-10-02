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

test('operator html redirects to an authenticated dynamic route before static file serving',()=>{
  const config=JSON.parse(read('vercel.json'));
  const api=read('api/survival-wiki.js');
  const redirect=(config.redirects||[]).find(row=>row.source==='/operator.html');
  const rewrite=(config.rewrites||[]).find(row=>row.source==='/operator');
  assert.deepEqual(redirect,{source:'/operator.html',destination:'/operator',permanent:false});
  assert.equal(rewrite?.destination,'/api/survival-wiki?mode=operator-page');
  assert.match(api,/stripOperatorDashboard/);
  assert.match(api,/Vary','Cookie/);
  assert.match(api,/operator-dashboard/);
});