'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const page=fs.readFileSync(path.join(root,'page.js'),'utf8');
const operatorHtml=fs.readFileSync(path.join(root,'operator.html'),'utf8');

function appShellBody(){return sw.match(/const APP_SHELL = \[([\s\S]*?)\n\]/)?.[1]||'';}

test('precache uses canonical asset URLs without manual query versions',()=>{
  const shell=appShellBody();
  assert.doesNotMatch(shell,/['"][^'"]+\.(?:js|css)\?v=/,'service worker precache must not pin stale query versions');
  for(const asset of ['/page.js','/site-shell.js','/mobile-site.css','/mobile-site.js']){
    assert.match(shell,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${asset} must be precached canonically`);
  }
});

test('runtime cache can fall back from versioned requests to canonical precache only on network failure',()=>{
  assert.match(sw,/matchCanonicalAsset/,'service worker needs canonical asset fallback helper');
  assert.match(sw,/cache\.match\(request\)/,'exact versioned cache match must remain first');
});

test('page and service worker share the same fallback deployment version',()=>{
  const swVersion=sw.match(/FALLBACK_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const pageVersion=page.match(/const fallback=['"]([^'"]+)['"]/)?.[1];
  assert.ok(swVersion&&pageVersion,'both fallbacks must be explicit');
  assert.equal(pageVersion,swVersion,'page registration and service worker fallback versions must stay aligned');
});

test('operator Redis diagnostics asset is cache-busted after degraded-mode changes',()=>{
  assert.match(operatorHtml,/operator-redis-diagnostics\.js\?v=2/,'operator diagnostics module version must advance with changed behavior');
});
