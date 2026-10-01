import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const guideSources=require('../lib/content-guide-sources.js');
const source=guideSources.SURVIVAL_WIKI_SOURCE;

assert.equal(source.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/');
assert.equal(guideSources.officialWikiContentUrl(source),'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/content');
assert.equal('SURVIVAL_WIKI_TRANSPORT_ORIGIN' in guideSources,false,'fan site must not expose a justserver3 Vercel transport for survival data');
assert.equal('officialWikiTransportUrl' in guideSources,false,'fan site must not use an alternate survival data transport');
assert.equal('officialWikiFeedUrl' in guideSources,false,'fan site must consume the official site content API directly');

const originalFetch=globalThis.fetch;
const calls=[];
const cmsPayload={
  revision:12,
  wiki:{
    pages:[
      {title:'채광',category:'생산 가이드',url:'https://daisy-grouse-ac0.notion.site/raw-source',deleted:false,pending:false,updatedAt:'2026-09-30T19:19:58.833Z',sections:[
        {title:'야생으로 이동',hidden:false,html:'<p>야생으로 이동하여 광물을 캘 수 있습니다.</p>'},
        {title:'광물 채광과 판매',hidden:false,html:'<p>야생에서 다양한 광물을 채광하여 판매할 수 있습니다.</p><div class="note">광물의 시세는 불규칙적으로 변동됩니다.</div>'},
        {title:'숨김',hidden:true,html:'<p>사용자에게 보이면 안 됩니다.</p>'}
      ]},
      {title:'삭제 문서',category:'공지사항',deleted:true,sections:[{title:'삭제',hidden:false,html:'<p>삭제됨</p>'}]},
      {title:'ADMIN',category:'ADMIN',deleted:false,sections:[{title:'내부',hidden:false,html:'<p>내부 정보</p>'}]}
    ],links:[],items:[],edition:1,catalogEdition:1
  }
};
globalThis.fetch=async url=>{
  calls.push(String(url));
  return {ok:true,status:200,json:async()=>cmsPayload};
};
try{
  const fetched=await guideSources.fetchOfficialWikiIndex(source,{timeoutMs:1000});
  assert.deepEqual(calls,['https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/content']);
  assert.equal(fetched.url,'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/api/content');
  assert.equal(fetched.transportUrl,undefined);
  assert.equal(fetched.payload.pages.length,1,'deleted and internal CMS pages must be excluded');
  assert.equal(fetched.payload.pages[0].title,'채광');
  assert.deepEqual(fetched.payload.pages[0].sections.map(row=>row.heading),['야생으로 이동','광물 채광과 판매']);
  assert.match(fetched.payload.pages[0].sections[1].text,/광물의 시세는 불규칙적으로 변동됩니다/);
  assert.doesNotMatch(JSON.stringify(fetched.payload),/daisy-grouse|notion\.site|justserver3\.vercel\.app/,'raw implementation URLs must not leak into the normalized survival guide payload');
  const rows=guideSources.officialWikiGuideRows(fetched.payload,source);
  assert.ok(rows.some(row=>row.pageTitle==='채광'&&/광물/.test(`${row.title} ${row.text}`)));
}finally{
  globalThis.fetch=originalFetch;
}

console.log('survival official content API regression: ok');
