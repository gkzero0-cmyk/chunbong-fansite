import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const guideSources=require('../lib/content-guide-sources.js');

const source=guideSources.SURVIVAL_WIKI_SOURCE;
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
const calls=[];
globalThis.fetch=async url=>{
  const value=String(url);
  calls.push(value);
  if(value==='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide'){
    return {ok:true,status:200,json:async()=>payload};
  }
  throw new Error(`unexpected fetch ${value}`);
};

try{
  const result=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(result.payload,payload);
  assert.deepEqual(calls,['https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide']);
  assert.equal(result.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide');
  assert.equal(result.transportUrl,undefined);
  assert.doesNotMatch(JSON.stringify(guideSources),/justserver3\.vercel\.app/);
  const rows=guideSources.officialWikiGuideRows(result.payload,source);
  assert.ok(rows.some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)),'official-domain feed must produce visible official-wiki guide rows');
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival official wiki feed regression: ok');
