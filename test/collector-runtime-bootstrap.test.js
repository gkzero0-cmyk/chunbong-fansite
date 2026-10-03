import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

const bootstrap=()=>read('chunbong-content-collector.user.js');
const runtime=()=>read('collector-runtime.js');
const manifest=()=>JSON.parse(read('collector-runtime-manifest.json'));
const helper=()=>read('operator-collector-install-helper.js');
const vercel=()=>JSON.parse(read('vercel.json'));

const requiredMatches=[
  'https://namu.wiki/w/*',
  'https://www.namu.wiki/w/*',
  'https://sooplive.com/station/chunbongtv/*',
  'https://www.sooplive.com/station/chunbongtv/*',
  'https://fmkorea.com/*',
  'https://www.fmkorea.com/*',
  'https://m.fmkorea.com/*',
  'https://chunbong-fansite.vercel.app/operator.html*'
];
const requiredGrants=['GM_getValue','GM_setValue','GM_deleteValue','GM_addValueChangeListener','GM_openInTab','GM_registerMenuCommand'];
const preservedKeys=[
  'cb-content-collector-queue-v1','cb-content-collector-seen-v1','cb-soop-history-v2','cb-soop-backfill-v2',
  'cb-content-collector-status-v1','cb-soop-diagnostics-v1','cb-soop-watch-lease-v1','cb-content-auto-open-claims-v1'
];

function cacheRule(config,source){return config.headers.find(entry=>entry.source===source)}
function cacheValue(rule,key){return rule?.headers?.find(header=>header.key.toLowerCase()===key.toLowerCase())?.value||''}

test('userscript becomes a thin v1.5.0 bootstrap with the existing permissions',()=>{
  const source=bootstrap();
  assert.match(source,/@version\s+1\.5\.0/);
  for(const match of requiredMatches)assert.ok(source.includes('// @match        '+match),match);
  for(const grant of requiredGrants)assert.ok(source.includes('// @grant        '+grant),grant);
  assert.match(source,/BOOTSTRAP_CONTRACT\s*=\s*1/);
  assert.match(source,/collector-runtime-manifest\.json/);
  assert.match(source,/cache:\s*['"]no-store['"]/);
  assert.match(source,/cb-content-runtime-source-v1/);
  assert.match(source,/cb-content-runtime-meta-v1/);
  assert.match(source,/runtimeUrl\.origin\s*!==\s*RUNTIME_ORIGIN/);
  assert.match(source,/eval\(source\)/);
  assert.doesNotMatch(source,/function\s+captureSoopPost/);
  assert.doesNotMatch(source,/function\s+discoverFmkPosts/);
});

test('remote runtime preserves collector state and automatic tab serialization',()=>{
  const source=runtime();
  for(const key of preservedKeys)assert.ok(source.includes(key),key);
  assert.match(source,/AUTO_OPEN_MAX_ACTIVE\s*=\s*1/);
  assert.match(source,/function\s+captureSoopPost/);
  assert.match(source,/async function\s+discoverFmkPosts/);
});

test('runtime manifest has an independent version and bootstrap compatibility range',()=>{
  const row=manifest();
  assert.equal(row.runtimeVersion,'1.0.1');
  assert.equal(row.runtimeUrl,'/collector-runtime.js');
  assert.equal(row.minBootstrapContract,1);
  assert.equal(row.maxBootstrapContract,1);
  assert.equal(row.disabled,false);
});

test('runtime resources explicitly disable stale caching',()=>{
  const config=vercel();
  for(const source of ['/chunbong-content-collector.user.js','/collector-runtime-manifest.json','/collector-runtime.js']){
    const rule=cacheRule(config,source);
    assert.ok(rule,'missing cache rule '+source);
    for(const key of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control']){
      const value=cacheValue(rule,key);
      assert.match(value,/no-cache/i,source+' '+key);
      assert.match(value,/no-store/i,source+' '+key);
      assert.match(value,/must-revalidate/i,source+' '+key);
    }
  }
});

test('operator helper distinguishes bootstrap and remote runtime state',()=>{
  const source=helper();
  assert.match(source,/COLLECTOR_LATEST_VERSION=['"]1\.5\.0['"]/);
  assert.match(source,/data-chunbong-collector-bootstrap-version/);
  assert.match(source,/data-chunbong-collector-runtime-version/);
  assert.match(source,/data-chunbong-collector-runtime-state/);
  assert.match(source,/data-chunbong-collector-reinstall-required/);
});
