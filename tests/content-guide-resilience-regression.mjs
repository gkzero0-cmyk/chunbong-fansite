import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');
const internals=archive._internals||{};
const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
const items=Array.isArray(seed)?seed:(seed.items||[]);

for(const name of ['officialWikiGuideRows','guideHydrationPlan','hydrateGuideForPublicItem','refreshOfficialWikiGuides']){
  assert.equal(typeof internals[name],'function',`${name} must exist`);
}

const source={
  id:'source-survival-wiki',
  label:'적자생존 공식 위키',
  url:'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/',
  type:'wiki',
  visibility:'public',
  status:'active'
};
const sampleIndex={
  generatedAt:'2026-10-01T00:00:00.000Z',
  pages:[
    {
      id:'guide-mining',title:'채광 가이드',slug:'mining',category:'GUIDE',order:10,
      description:'광물을 채굴하는 방법',
      hero:'/notion-assets/mining/hero.webp',
      sections:[
        {id:'intro',heading:'채광 시작',anchor:'intro',text:'곡괭이를 준비합니다.'},
        {id:'ore',heading:'광물',anchor:'ore',text:'층별 광물을 확인합니다.'}
      ]
    },
    {
      id:'admin-debug',title:'관리자 디버그',slug:'admin-debug',category:'ADMIN',order:999,
      sections:[{id:'secret',heading:'내부 설정',text:'사용자에게 노출하면 안 됩니다.'}]
    }
  ]
};
const rows=internals.officialWikiGuideRows(sampleIndex,source);
assert.ok(rows.length>=2,'public wiki guide sections should be converted');
assert.ok(rows.some(row=>row.title==='채광 시작'&&/곡괭이/.test(row.text)),'guide text should survive conversion');
assert.ok(rows.some(row=>(row.images||[]).some(image=>/notion-assets\/mining\/hero\.webp/.test(image.src||''))),'wiki image assets should be preserved');
assert.equal(rows.some(row=>/관리자|내부 설정/.test(`${row.title} ${row.text}`)),false,'ADMIN pages must not leak into public guide');

const findBySource=id=>items.find(item=>(item.sources||[]).some(source=>source.id===id));
const diamond=findBySource('source-diamond-notion');
const money=findBySource('source-moneygame-notion');
const survival=findBySource('source-survival-notion');
assert.ok(diamond,'diamond Notion source missing from seed');
assert.ok(money,'moneygame Notion source missing from seed');
assert.ok(survival,'survival source missing from seed');

assert.equal(internals.guideHydrationPlan(diamond).some(row=>row.kind==='notion'),true,'diamond should self-hydrate from Notion when Redis guide rows are missing');
assert.equal(internals.guideHydrationPlan(money).some(row=>row.kind==='notion'),true,'moneygame should self-hydrate from its hidden Notion source when Redis guide rows are missing');
assert.equal(internals.guideHydrationPlan(survival).some(row=>row.kind==='official-wiki'),true,'survival should map to the structured official wiki feed');

const apiSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
const adapterSource=fs.readFileSync(new URL('../lib/content-guide-sources.js',import.meta.url),'utf8');
assert.match(apiSource,/await hydrateGuideForPublicItem\(/,'public detail must self-hydrate a guide when Redis-backed sections are unavailable');
assert.match(apiSource,/refreshOfficialWikiGuides/,'scheduled archive sync must include official wiki guides');
assert.match(adapterSource,/notion-assets\/index\.json/,'official wiki sync should consume the structured index, not scrape rendered HTML');
assert.doesNotMatch(adapterSource,/<main|querySelector|cheerio/i,'official wiki adapter must not scrape rendered HTML');

console.log('content guide resilience regression: ok');
