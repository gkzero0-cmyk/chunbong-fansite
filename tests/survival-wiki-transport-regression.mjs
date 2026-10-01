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
    if(value==='https://justserver3.vercel.app/notion-assets/index.json'){
      return {ok:true,status:200,json:async()=>payload};
    }
    throw new Error(`unexpected primary fetch ${value}`);
  };

  const primary=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(primaryCalls,[
    'https://justserver3.vercel.app/notion-assets/index.json'
  ],'hydration should use the proven structured transport first so an unavailable public asset path cannot consume the serverless request budget');
  assert.equal(primary.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json','public source identity must remain the official custom-domain URL');
  assert.equal(primary.transportUrl,'https://justserver3.vercel.app/notion-assets/index.json','diagnostics should identify the successful transport without changing public attribution');
  assert.ok(guideSources.officialWikiGuideRows(primary.payload,source).some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)));

  const fallbackCalls=[];
  globalThis.fetch=async url=>{
    const value=String(url);
    fallbackCalls.push(value);
    if(value==='https://justserver3.vercel.app/notion-assets/index.json'){
      return {ok:false,status:502,json:async()=>({})};
    }
    if(value==='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json'){
      return {ok:true,status:200,json:async()=>payload};
    }
    throw new Error(`unexpected fallback fetch ${value}`);
  };

  const fallback=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(fallbackCalls,[
    'https://justserver3.vercel.app/notion-assets/index.json',
    'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json'
  ],'the official public asset path should remain a single fallback if the proven transport fails');
  assert.equal(fallback.transportUrl,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json');
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival wiki transport regression: ok');
