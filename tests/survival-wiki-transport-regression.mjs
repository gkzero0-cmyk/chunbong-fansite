import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const guideSources=require('../lib/content-guide-sources.js');

const source=guideSources.SURVIVAL_WIKI_SOURCE;
const officialUrl='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide';
const deliveryUrl='https://justserver3.vercel.app/api/fansite-guide';
const payload={
  source:'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/',
  generatedAt:'2026-10-01T00:00:00.000Z',
  pages:[{
    pageId:'mining',
    title:'채광',
    sections:[{heading:'채광 안내',anchor:'intro',text:'야생에서 광물을 채광하여 판매할 수 있습니다.'}]
  }]
};

const originalFetch=globalThis.fetch;
try{
  const directCalls=[];
  globalThis.fetch=async url=>{
    const value=String(url);directCalls.push(value);
    if(value===officialUrl)return {ok:true,status:200,json:async()=>payload};
    throw new Error(`unexpected fetch ${value}`);
  };
  const direct=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000,primaryTimeoutMs:100});
  assert.deepEqual(directCalls,[officialUrl],'official custom domain must always be queried first');
  assert.equal(direct.url,officialUrl);
  assert.equal(direct.deliveryFallbackUsed,false);
  assert.equal(direct.source,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/');

  const fallbackCalls=[];
  globalThis.fetch=async (url,options={})=>{
    const value=String(url);fallbackCalls.push(value);
    if(value===officialUrl){
      return await new Promise((resolve,reject)=>{
        const abort=()=>{const error=new Error('aborted');error.name='AbortError';reject(error)};
        if(options.signal?.aborted)return abort();
        options.signal?.addEventListener('abort',abort,{once:true});
      });
    }
    if(value===deliveryUrl)return {ok:true,status:200,json:async()=>payload};
    throw new Error(`unexpected fetch ${value}`);
  };
  const fallback=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000,primaryTimeoutMs:25});
  assert.deepEqual(fallbackCalls,[officialUrl,deliveryUrl],'delivery fallback may run only after the official domain fails or times out');
  assert.equal(fallback.url,officialUrl,'canonical public URL must remain the official wiki URL');
  assert.equal(fallback.source,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/','source of truth must remain the official wiki URL');
  assert.equal(fallback.deliveryFallbackUsed,true);
  assert.ok(guideSources.officialWikiGuideRows(fallback.payload,source).some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)));

  globalThis.fetch=async (url,options={})=>{
    const value=String(url);
    if(value===officialUrl){
      return await new Promise((resolve,reject)=>{
        const abort=()=>{const error=new Error('aborted');error.name='AbortError';reject(error)};
        if(options.signal?.aborted)return abort();
        options.signal?.addEventListener('abort',abort,{once:true});
      });
    }
    if(value===deliveryUrl)return {ok:true,status:200,json:async()=>({...payload,source:'https://example.invalid/'})};
    throw new Error(`unexpected fetch ${value}`);
  };
  await assert.rejects(
    guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000,primaryTimeoutMs:25}),
    /official_wiki_source_mismatch/,
    'delivery fallback must be rejected unless the payload self-identifies as the official custom-domain source'
  );
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival verified delivery fallback regression: ok');
