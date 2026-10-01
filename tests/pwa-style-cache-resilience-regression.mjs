import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const swSource=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const themeSource=fs.readFileSync(new URL('../theme-init.js',import.meta.url),'utf8');

assert.match(swSource,/MEDIA_CACHE_PREFIX|MEDIA_CACHE_NAME/,'media/font cache must be separated from the core app-shell cache');
assert.match(swSource,/pruneMediaCache/,'media cache must be bounded and pruned');
assert.match(swSource,/MAX_MEDIA_ENTRIES/,'media cache must have an entry limit');
assert.match(swSource,/MAX_MEDIA_AGE_MS/,'media cache must have an age limit');
assert.match(swSource,/safeCachePut/,'cache writes must be isolated from network response delivery');
assert.match(themeSource,/stylesheet/i,'early theme bootstrap must install stylesheet failure recovery');
assert.match(themeSource,/style-retry/,'stylesheet recovery must retry with a cache-bypass query exactly once');

async function runStyleFetchWithBrokenCache(){
  const listeners=new Map();
  const coreCache={
    async match(){return null},
    async put(){throw new Error('QuotaExceededError')},
    async keys(){return[]},
    async delete(){return true},
    async addAll(){}
  };
  const mediaCache={...coreCache};
  const context={
    URL,Request,Response,Headers,setTimeout,clearTimeout,Promise,console,
    fetch:async()=>new Response('body{color:red}',{status:200,headers:{'content-type':'text/css'}}),
    caches:{
      async open(name){return /media/.test(name)?mediaCache:coreCache},
      async keys(){return[]},
      async delete(){return true}
    },
    self:{
      location:{href:'https://example.com/service-worker.js?v=test-build',origin:'https://example.com'},
      registration:{navigationPreload:null,showNotification:async()=>{}},
      clients:{claim:async()=>{},matchAll:async()=>[],openWindow:async()=>{}},
      skipWaiting:()=>{},
      addEventListener(type,handler){listeners.set(type,handler)}
    }
  };
  vm.createContext(context);
  vm.runInContext(swSource,context,{filename:'service-worker.js'});
  const handler=listeners.get('fetch');
  assert.equal(typeof handler,'function','service worker fetch handler missing');
  let responsePromise=null;
  const waits=[];
  const request={
    method:'GET',
    url:'https://example.com/styles.css',
    mode:'cors',
    destination:'style'
  };
  handler({
    request,
    respondWith(value){responsePromise=Promise.resolve(value)},
    waitUntil(value){waits.push(Promise.resolve(value).catch(()=>null))}
  });
  assert.ok(responsePromise,'style request must be intercepted');
  const response=await responsePromise;
  await Promise.allSettled(waits);
  return response;
}

const response=await runStyleFetchWithBrokenCache();
assert.equal(response.status,200,'a failed CacheStorage write must never turn a valid stylesheet network response into Response.error()');
assert.match(await response.text(),/color:red/,'the original network stylesheet body must reach the page');

console.log('pwa style/cache resilience regression: ok');
