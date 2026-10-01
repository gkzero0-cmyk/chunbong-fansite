'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('shared header controls are prepared before idle phase',()=>{
  const health=read('site-health.js');
  assert.match(health,/site-improvements\.js\?v=2/);
  assert.match(health,/personal-hub\.js/);
  assert.match(health,/data-header-improvements-critical/);
  assert.match(health,/data-personal-hub-critical/);
});

test('chunbong content hero uses supplied high resolution asset',()=>{
  const html=read('chunbong-contents.html');
  assert.match(html,/chunbong-content-planning-hero-hq/);
  assert.doesNotMatch(html,/e_gen_restore/);
  assert.doesNotMatch(html,/v1790884100\/chunbong-content-planning-hero\.webp/);
});

test('public operator page contains auth shell but no dashboard cards or tabs',()=>{
  const html=read('operator.html');
  assert.match(html,/id="operator-protected-root"/);
  assert.match(html,/id="operator-dashboard"[^>]*hidden/);
  assert.doesNotMatch(html,/operator-tabs/);
  assert.doesNotMatch(html,/콘텐츠 아카이브/);
  assert.doesNotMatch(html,/검색 분석/);
  assert.doesNotMatch(html,/PRIVATE DASHBOARD/);
});

test('operator dashboard markup endpoint requires owner session',()=>{
  const api=read('lib/operator-dashboard-api.js');
  assert.match(api,/async function handleOperatorDashboardMarkup\(req,res\)[\s\S]*requireOwner\(req,res\)/);
  const mux=read('api/content.js');
  assert.match(mux,/type==='operator-dashboard-markup'/);
  const bootstrap=read('operator-bootstrap.js');
  assert.match(bootstrap,/operator-session/);
  assert.match(bootstrap,/operator-dashboard-markup/);
});
