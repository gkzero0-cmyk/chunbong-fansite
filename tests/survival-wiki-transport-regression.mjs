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
const calls=[];
globalThis.fetch=async url=>{
  const value=String(url);
  calls.push(value);
  if(value==='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json'){
    return {ok:false,status:502,json:async()=>({})};
  }
  if(value==='https://justserver3.vercel.app/notion-assets/index.json'){
    return {ok:true,status:200,json:async()=>payload};
  }
  throw new Error(`unexpected fetch ${value}`);
};

try{
  const result=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(result.payload,payload,'official wiki adapter should recover the structured guide payload through the trusted Vercel transport');
  assert.deepEqual(calls,[
    'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json',
    'https://justserver3.vercel.app/notion-assets/index.json'
  ],'official wiki adapter should try the public custom domain first, then exactly one trusted Vercel transport fallback');
  assert.equal(result.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/notion-assets/index.json','public source identity must remain the official custom-domain URL');
  assert.equal(result.transportUrl,'https://justserver3.vercel.app/notion-assets/index.json','diagnostics should identify the actual successful transport without changing public attribution');
  const rows=guideSources.officialWikiGuideRows(result.payload,source);
  assert.ok(rows.some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)),'transport fallback must still produce visible official-wiki guide rows');
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival wiki transport regression: ok');
