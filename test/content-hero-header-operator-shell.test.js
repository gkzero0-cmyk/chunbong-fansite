'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');

test('Chunbong content hero uses the supplied high-resolution cache-busted asset',()=>{
  const html=read('chunbong-contents.html');
  const asset='assets/chunbong-content-hero-20261002.webp';
  assert.match(html,/\/assets\/chunbong-content-hero-20261002\.webp/);
  assert.match(html,/width="1672"[^>]*height="941"/);
  assert.doesNotMatch(html,/e_gen_restore\/c_scale/);
  assert.equal(fs.existsSync(asset),true);
  assert.ok(fs.statSync(asset).size>150000,'hero asset must retain enough source detail for desktop rendering');
});

test('header reserves utility width and loads visual utilities through the idle shell',()=>{
  const init=read('theme-init.js');
  const shell=read('site-shell.js');
  const idle=read('site-shell-idle.js');
  assert.match(init,/data-header-layout-reserve/);
  assert.match(init,/MutationObserver/);
  assert.match(init,/Math\.max\(0,238-used\)/);
  assert.match(init,/site-improvements\.css\?v=2/);
  assert.match(init,/DOMContentLoaded',load/);
  assert.match(init,/script\.src='site-improvements\.js\?v=2'/);
  assert.match(shell,/site-shell-idle\.js/,'critical shell should defer non-critical work to the idle shell');
  assert.match(idle,/schedule\(\(\)=>loadScript\('site-improvements\.js\?v=2'\)/,'site improvements should be loaded by the idle shell');
});

test('operator route resolves through authenticated dynamic handler before static dashboard content is exposed',()=>{
  const config=JSON.parse(read('vercel.json'));
  const api=read('api/survival-wiki.js');
  const redirect=(config.redirects||[]).find(row=>row.source==='/operator');
  const rewrite=(config.rewrites||[]).find(row=>row.source==='/operator.html');
  assert.deepEqual(redirect,{source:'/operator',destination:'/operator.html',permanent:false});
  assert.equal(rewrite?.destination,'/api/survival-wiki?mode=operator-page');
  assert.match(api,/stripOperatorDashboard/);
  assert.match(api,/Vary','Cookie/);
});

test('unauthenticated operator shell contains only auth UI, not dashboard DOM or operator modules',()=>{
  const {stripOperatorDashboard}=require('../api/survival-wiki')._internals;
  const shell=stripOperatorDashboard(read('operator.html'));
  assert.match(shell,/id="operator-login"/);
  assert.doesNotMatch(shell,/id="operator-dashboard"/);
  assert.doesNotMatch(shell,/operator-panel-overview/);
  assert.doesNotMatch(shell,/operator-panel-contents/);
  assert.doesNotMatch(shell,/operator\.js/);
  assert.doesNotMatch(shell,/operator-redis-diagnostics\.js/);
});
