import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const userscript=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const STATUS_KEY='cb-content-collector-status-v1';
const LAST_GOOD_KEY='cb-content-collector-runtime-last-good-v1';

function runtimeSource(body){
  return `// runtime fixture ${'x'.repeat(240)}\n(function(){\n  'use strict';\n  async function run(){${body}}\n  void run();\n})();`;
}

function responseJson(value){return{ok:true,status:200,async json(){return value},async text(){return JSON.stringify(value)}}}
function responseText(value){return{ok:true,status:200,async json(){return JSON.parse(value)},async text(){return value}}}

async function runBootstrap({manifest,runtime,cached}={}){
  const store=new Map();
  if(cached)store.set(LAST_GOOD_KEY,cached);
  const attrs=new Map();
  const calls=[];
  const sandbox={
    URL,
    Date,
    console,
    setTimeout,
    clearTimeout,
    CustomEvent:class CustomEvent{constructor(type){this.type=type}},
    location:{origin:'https://chunbong-fansite.vercel.app'},
    document:{
      documentElement:{setAttribute(key,value){attrs.set(key,String(value))}},
      dispatchEvent(){}
    },
    window:{postMessage(){}},
    GM_getValue(key,fallback){return store.has(key)?store.get(key):fallback},
    GM_setValue(key,value){store.set(key,value)},
    GM_deleteValue(key){store.delete(key)},
    GM_addValueChangeListener(){return 1},
    GM_openInTab(){return{}},
    GM_registerMenuCommand(){},
    async fetch(url){
      calls.push(String(url));
      if(String(url).includes('collector-runtime-manifest.json'))return responseJson(manifest);
      if(String(url).includes('collector-runtime.js')){
        if(runtime instanceof Error)throw runtime;
        return responseText(runtime);
      }
      throw new Error('unexpected_fetch_'+url);
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(userscript,sandbox);
  await new Promise(resolve=>setTimeout(resolve,30));
  return{store,attrs,calls,status:store.get(STATUS_KEY)};
}

const compatibleManifest={runtimeVersion:'1.0.0',runtimeUrl:'/collector-runtime.js',minBootstrapContract:1,maxBootstrapContract:1,disabled:false};

test('bootstrap loads compatible remote runtime and stores it as last-known-good',async()=>{
  const source=runtimeSource("GM_setValue('runtime-probe','remote-ok');");
  const result=await runBootstrap({manifest:compatibleManifest,runtime:source});
  assert.equal(result.store.get('runtime-probe'),'remote-ok');
  assert.equal(result.status.runtimeState,'current');
  assert.equal(result.status.runtimeVersion,'1.0.0');
  assert.equal(result.status.reinstallRequired,false);
  assert.equal(result.store.get(LAST_GOOD_KEY).source,source);
  assert.equal(result.store.get(LAST_GOOD_KEY).contract,1);
  assert.match(result.calls[0],/collector-runtime-manifest\.json/);
  assert.match(result.calls[1],/collector-runtime\.js/);
});

test('bootstrap falls back to compatible cached runtime after remote initialization fails',async()=>{
  const cachedSource=runtimeSource("GM_setValue('runtime-probe','cached-ok');");
  const failingSource=runtimeSource("throw new Error('runtime-boom');");
  const result=await runBootstrap({
    manifest:compatibleManifest,
    runtime:failingSource,
    cached:{source:cachedSource,version:'0.9.9',contract:1,savedAt:'2026-10-03T00:00:00.000Z'}
  });
  assert.equal(result.store.get('runtime-probe'),'cached-ok');
  assert.equal(result.status.runtimeState,'cached fallback');
  assert.equal(result.status.runtimeVersion,'0.9.9');
  assert.match(result.status.lastRuntimeError,/runtime-boom/);
});

test('disabled manifest stops runtime execution without deleting existing data',async()=>{
  const manifest={...compatibleManifest,disabled:true};
  const result=await runBootstrap({manifest,runtime:runtimeSource("GM_setValue('runtime-probe','should-not-run');")});
  assert.equal(result.store.has('runtime-probe'),false);
  assert.equal(result.status.runtimeState,'disabled');
  assert.equal(result.calls.length,1);
});

test('incompatible manifest enters degraded mode and requests bootstrap reinstall',async()=>{
  const manifest={...compatibleManifest,minBootstrapContract:2,maxBootstrapContract:2};
  const result=await runBootstrap({manifest,runtime:runtimeSource('')});
  assert.equal(result.status.runtimeState,'degraded');
  assert.equal(result.status.reinstallRequired,true);
  assert.match(result.status.lastRuntimeError,/runtime_contract_incompatible/);
  assert.equal(result.calls.length,1);
});

test('non-production runtime origin is rejected before runtime fetch',async()=>{
  const manifest={...compatibleManifest,runtimeUrl:'https://example.invalid/collector-runtime.js'};
  const result=await runBootstrap({manifest,runtime:runtimeSource('')});
  assert.equal(result.status.runtimeState,'degraded');
  assert.match(result.status.lastRuntimeError,/runtime_origin_rejected/);
  assert.equal(result.calls.length,1);
});
