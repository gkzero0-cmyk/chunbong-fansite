'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('shared header structure is not idle injected',()=>{
  const shell=read('site-shell.js');
  assert.doesNotMatch(shell,/runIdle\(\(\)=>loadScript\('site-improvements\.js/);
  assert.doesNotMatch(shell,/personalPriorityPages[\s\S]*runIdle\(loadPersonal\)/);
});

test('chunbong content hero uses supplied high resolution local asset',()=>{
  const html=read('chunbong-contents.html');
  assert.match(html,/assets\/chunbong-content-hero-hq\.webp/);
  assert.doesNotMatch(html,/chunbong-content-planning-hero/);
  assert.doesNotMatch(html,/e_gen_restore/);
});

test('public operator page contains no dashboard cards or tabs',()=>{
  const html=read('operator.html');
  assert.match(html,/id="operator-protected-root"/);
  assert.doesNotMatch(html,/id="operator-dashboard"/);
  assert.doesNotMatch(html,/operator-tabs/);
  assert.doesNotMatch(html,/콘텐츠 아카이브/);
  assert.doesNotMatch(html,/검색 분석/);
});

test('operator dashboard markup endpoint requires owner session',()=>{
  const api=read('lib/operator-center-api.js');
  assert.match(api,/async function handleOperatorDashboardMarkup\(req,res\)[\s\S]*requireOwner\(req,res\)/);
  const mux=read('api/content.js');
  assert.match(mux,/type==='operator-dashboard-markup'/);
});
