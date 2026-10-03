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

test('collector runtime preserves v1.4.8 behavior keys and automatic tab serialization',()=>{
  const runtime=optionalRead('collector-runtime.js');
  assert.ok(runtime,'collector-runtime.js must exist');
  for(const key of requiredStorageKeys)assert.match(runtime,new RegExp(key));
  assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE\s*=\s*1/);
  assert.match(runtime,/function\s+captureSoopPost/);
  assert.match(runtime,/function\s+captureFmkPost/);
  assert.match(runtime,/function\s+captureNamu/);
});

test('collector runtime manifest is the runtime version and compatibility source of truth',()=>{
  const manifest=JSON.parse(optionalRead('collector-runtime-manifest.json'));
  assert.equal(manifest.runtimeVersion,'1.0.0');
  assert.equal(manifest.runtimeUrl,'/collector-runtime.js');
  assert.equal(manifest.minBootstrapContract,1);
  assert.equal(manifest.maxBootstrapContract,1);
  assert.equal(manifest.disabled,false);
});

test('all collector runtime resources disable stale caching',()=>{
  for(const path of ['/chunbong-content-collector.user.js','/collector-runtime-manifest.json','/collector-runtime.js']){
    const cache=cacheValue(path);
    assert.match(cache,/no-cache/i,`${path} no-cache`);
    assert.match(cache,/no-store/i,`${path} no-store`);
    assert.match(cache,/must-revalidate/i,`${path} must-revalidate`);
  }
});

test('operator center distinguishes bootstrap and runtime status',()=>{
  for(const marker of ['bootstrapVersion','runtimeVersion','runtimeState','lastRuntimeCheckAt','lastRuntimeLoadedAt','reinstallRequired'])assert.match(helper,new RegExp(marker));
  assert.match(helper,/재설치[^\n]{0,120}필요하지|재설치[^\n]{0,120}필요 없음|Tampermonkey[^\n]{0,120}재설치/i);
});

test('bootstrap validates same-origin runtime and supports compatible cached fallback',()=>{
  assert.match(userscript,/https:\/\/chunbong-fansite\.vercel\.app/);
  assert.match(userscript,/new URL\([^\n]*runtimeUrl[^\n]*PRODUCTION_ORIGIN/);
  assert.match(userscript,/resolved\.origin\s*!==\s*PRODUCTION_ORIGIN/);
  assert.match(userscript,/cache\s*:\s*['"]no-store['"]/);
  assert.match(userscript,/LAST_GOOD_KEY/);
  assert.match(userscript,/runtimeState:'degraded'/);
  assert.match(userscript,/runtimeState:'disabled'/);
});

test('bootstrap only saves last-known-good runtime after executeRuntime succeeds',()=>{
  const executeIndex=userscript.indexOf('await executeRuntime(source);');
  const saveIndex=userscript.indexOf('saveLastGood(source,manifest.runtimeVersion);');
  assert.ok(executeIndex>=0&&saveIndex>executeIndex,'last-known-good must be saved after successful runtime execution');
});
