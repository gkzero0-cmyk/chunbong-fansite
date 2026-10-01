import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const guideSources=require('../lib/content-guide-sources.js');
const source=guideSources.SURVIVAL_WIKI_SOURCE;

assert.equal(source.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/');
assert.equal(guideSources.officialWikiFeedUrl(source),'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide');
assert.equal('SURVIVAL_WIKI_TRANSPORT_ORIGIN' in guideSources,false,'fan site must not expose a justserver3 Vercel transport for survival data');
assert.equal('officialWikiTransportUrl' in guideSources,false,'fan site must not use an alternate survival data transport');

const originalFetch=globalThis.fetch;
const calls=[];
const payload={source:source.url,generatedAt:'2026-10-01T00:00:00.000Z',pages:[{pageId:'mining',title:'채광',sections:[{heading:'채광 안내',anchor:'intro',text:'야생에서 광물을 채광하여 판매할 수 있습니다.'}]}]};
globalThis.fetch=async url=>{
  calls.push(String(url));
  return {ok:true,status:200,json:async()=>payload};
};
try{
  const fetched=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(calls,['https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide']);
  assert.equal(fetched.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/fansite-guide');
  assert.equal(fetched.transportUrl,undefined);
  assert.ok(guideSources.officialWikiGuideRows(fetched.payload,source).some(row=>row.pageTitle==='채광'&&/광물/.test(row.text)));
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival official-domain feed regression: ok');
