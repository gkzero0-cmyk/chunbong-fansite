import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const guideSources=require('../lib/content-guide-sources.js');

const source={
  id:'source-survival-wiki',
  kind:'reference',
  label:'그냥서버 적자생존 공식 위키',
  url:'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/',
  visibility:'public'
};
const officialIndex='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json';
const transportIndex='https://justserver3.vercel.app/notion-assets/index.json';
const payload={
  generatedAt:'2026-10-01T00:00:00.000Z',
  pages:[{
    pageId:'mining',
    title:'채광',
    sections:[{heading:'채광 안내',anchor:'intro',text:'야생에서 광물을 채광하여 판매할 수 있습니다.'}]
  }]
};

const originalFetch=globalThis.fetch;
try{
  const primaryCalls=[];
  globalThis.fetch=async url=>{
    const value=String(url);
    primaryCalls.push(value);
    if(value===officialIndex)return {ok:true,status:200,json:async()=>payload};
    throw new Error(`unexpected primary fetch ${value}`);
  };

  const primary=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000,primaryTimeoutMs:50});
  assert.deepEqual(primaryCalls,[officialIndex],'official custom domain must always be the first and canonical data source');
  assert.equal(primary.url,officialIndex,'public source identity must remain the official custom-domain URL');
  assert.equal(primary.transportUrl,officialIndex,'a successful official fetch must not be attributed to a transport mirror');
  assert.ok(guideSources.officialWikiGuideRows(primary.payload,source).some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)));

  const fallbackCalls=[];
  globalThis.fetch=async (url,options={})=>{
    const value=String(url);
    fallbackCalls.push(value);
    if(value===officialIndex){
      return await new Promise((resolve,reject)=>{
        const abort=()=>{const error=new Error('aborted');error.name='AbortError';reject(error)};
        if(options.signal?.aborted)return abort();
        options.signal?.addEventListener('abort',abort,{once:true});
      });
    }
    if(value===transportIndex)return {ok:true,status:200,json:async()=>payload};
    throw new Error(`unexpected fallback fetch ${value}`);
  };

  const started=Date.now();
  const fallback=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000,primaryTimeoutMs:25});
  const elapsed=Date.now()-started;
  assert.deepEqual(fallbackCalls,[officialIndex,transportIndex],'transport fallback is allowed only after the official custom domain fails or times out');
  assert.ok(elapsed<500,'official-source timeout must be bounded so the serverless request still has time to recover');
  assert.equal(fallback.url,officialIndex,'canonical source identity must remain the official custom-domain URL even when delivery fallback is used');
  assert.equal(fallback.transportUrl,transportIndex,'diagnostics may record a delivery fallback without changing the official source of truth');
  assert.equal(source.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/');
  assert.ok(guideSources.officialWikiGuideRows(fallback.payload,source).every(row=>row.sourceId==='source-survival-wiki'));
  assert.ok(guideSources.officialWikiGuideRows(fallback.payload,source).some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)));
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival wiki transport regression: ok');
