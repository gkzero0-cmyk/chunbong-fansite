import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
let mode='ok';
globalThis.fetch=async()=>{
  if(mode==='fail')throw new Error('provider timeout');
  return {ok:true,status:200,json:async()=>({value:42})};
};

const shared=require('../lib/content-api/_shared.js');
const headers={'x-test':'stale-fallback'};
const url='https://example.invalid/quota-test';
const first=await shared.getJson(url,headers);
assert.equal(first.value,42);

const key=[...shared._cacheInternals.jsonResponseCache.keys()].find(value=>String(value).startsWith(url+'|'));
assert.ok(key,'cache entry should exist after successful upstream request');
const entry=shared._cacheInternals.jsonResponseCache.get(key);
entry.at=Date.now()-2*60*1000;
mode='fail';
const stale=await shared.getJson(url,headers);
assert.equal(stale.value,42,'stale last-good JSON should survive a temporary provider failure');

entry.at=Date.now()-7*60*60*1000;
await assert.rejects(()=>shared.getJson(url,headers),/provider timeout/,'expired stale data must not mask a prolonged outage');

console.log('external stale fallback fault-injection passed');
