import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const userscript=read('chunbong-content-collector.user.js');
const helper=read('operator-collector-install-helper.js');
const vercel=JSON.parse(read('vercel.json'));

const requiredStorageKeys=[
  'cb-content-collector-queue-v1',
  'cb-content-collector-seen-v1',
  'cb-soop-history-v2',
  'cb-soop-backfill-v2',
  'cb-content-collector-status-v1',
  'cb-soop-diagnostics-v1'
];

function optionalRead(path){try{return read(path)}catch{return''}}

function cacheValue(path){
  const rule=vercel.headers.find(entry=>entry.source===path);
  return rule?.headers?.find(header=>String(header.key).toLowerCase()==='cache-control')?.value||'';
}

test('collector runtime bootstrap keeps metadata but removes full parser bodies',()=>{
  for(const marker of [
    '@match        https://namu.wiki/w/*',
    '@match        https://www.sooplive.com/station/chunbongtv/*',
    '@match        https://www.fmkorea.com/*',
    '@grant        GM_getValue',
    '@grant        GM_setValue',
    '@grant        GM_openInTab'
  ]) assert.match(userscript,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(userscript,/BOOTSTRAP_CONTRACT\s*=\s*1/);
  assert.match(userscript,/collector-runtime-manifest\.json/);
  assert.doesNotMatch(userscript,/function\s+captureSoopPost/);
  assert.doesNotMatch(userscript,/function\s+captureFmkPost/);
  assert.doesNotMatch(userscript,/function\s+captureNamu/);
});

test('collector runtime preserves storage keys and automatic tab serialization',()=>{
  const runtime=optionalRead('collector-runtime.js');
  assert.ok(runtime,'collector-runtime.js must exist');
  for(const key of requiredStorageKeys)assert.match(runtime,new RegExp(key));
  assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE\s*=\s*1/);
  assert.match(runtime,/runtimeVersion\s*=\s*['"]1\.0\.0['"]/);
  assert.match(runtime,/runtimeContract\s*=\s*1/);
});

test('collector runtime manifest and all runtime resources disable stale caching',()=>{
  const raw=optionalRead('collector-runtime-manifest.json');
  assert.ok(raw,'collector-runtime-manifest.json must exist');
  const manifest=JSON.parse(raw);
  assert.equal(manifest.runtimeVersion,'1.0.0');
  assert.equal(manifest.runtimeUrl,'/collector-runtime.js');
  assert.equal(manifest.minBootstrapContract,1);
  assert.equal(manifest.maxBootstrapContract,1);
  assert.equal(manifest.disabled,false);
  for(const path of ['/chunbong-content-collector.user.js','/collector-runtime-manifest.json','/collector-runtime.js']){
    const cache=cacheValue(path);
    assert.match(cache,/no-cache/i,`${path} no-cache`);
    assert.match(cache,/no-store/i,`${path} no-store`);
    assert.match(cache,/must-revalidate/i,`${path} must-revalidate`);
  }
});

test('operator center distinguishes bootstrap and runtime status',()=>{
  for(const marker of ['bootstrapVersion','runtimeVersion','runtimeState','lastRuntimeCheckAt','lastRuntimeLoadedAt','reinstallRequired']){
    assert.match(helper,new RegExp(marker));
  }
  assert.match(helper,/재설치[^\n]{0,80}필요하지|재설치[^\n]{0,80}필요 없음|Tampermonkey[^\n]{0,80}재설치/i);
});

test('bootstrap validates same-origin runtime and supports compatible cached fallback',()=>{
  assert.match(userscript,/https:\/\/chunbong-fansite\.vercel\.app/);
  assert.match(userscript,/new URL\([^)]*runtimeUrl[^)]*\)/);
  assert.match(userscript,/origin[^\n]{0,120}PRODUCTION_ORIGIN|PRODUCTION_ORIGIN[^\n]{0,120}origin/);
  assert.match(userscript,/cache\s*:\s*['"]no-store['"]/);
  assert.match(userscript,/last-known-good|LAST_GOOD|lastGood/i);
  assert.match(userscript,/degraded/);
  assert.match(userscript,/disabled/);
});
