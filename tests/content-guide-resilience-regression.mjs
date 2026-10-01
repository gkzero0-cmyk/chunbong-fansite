import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api.js');
const internals=archive._internals||{};
const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
const items=Array.isArray(seed)?seed:(seed.items||[]);

for(const name of ['officialWikiGuideRows','guideHydrationPlan','hydrateGuideForPublicItem','refreshOfficialWikiGuides','sanitizeSurvivalGuideItem']){
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
      pageId:'3dad57d6a55c807d8738ee94e33d7b13',title:'채광 가이드',
      description:'광물을 채굴하는 방법',
      hero:'/notion-assets/mining/hero.webp',
      sections:[
        {heading:'채광 시작',anchor:'intro',text:'곡괭이를 준비합니다.'},
        {heading:'야생에서 다양한 광물을 채광하여 판매할 수 있습니다.',anchor:'ore-sale',text:''},
        {heading:'광물의 시세는 불규칙적으로 변동됩니다.',anchor:'ore-price',text:''}
      ]
    },
    {
      pageId:'second-public-page',title:'가나다 후속 문서',
      sections:[{heading:'후속 안내',anchor:'after',text:'소스 순서를 유지해야 합니다.'}]
    },
    {
      id:'admin-debug',title:'관리자 디버그',slug:'admin-debug',category:'ADMIN',order:999,
      sections:[{id:'secret',heading:'내부 설정',text:'사용자에게 노출하면 안 됩니다.'}]
    }
  ]
};
const rows=internals.officialWikiGuideRows(sampleIndex,source);
assert.ok(rows.length>=4,'public wiki guide sections should be converted');
assert.equal(rows[0]?.pageTitle,'채광 가이드','official wiki pages should preserve source index order when no explicit order is provided');
assert.ok(rows.some(row=>row.title==='채광 시작'&&/곡괭이/.test(row.text)),'guide text should survive conversion');
assert.ok(rows.some(row=>row.title==='야생에서 다양한 광물을 채광하여 판매할 수 있습니다.'),'heading-only wiki content must not be dropped');
assert.ok(rows.some(row=>row.title==='광물의 시세는 불규칙적으로 변동됩니다.'),'all heading-only guide rules must remain visible');
assert.ok(rows.some(row=>String(row.id||'').includes('3dad57d6a55c807d8738ee94e33d7b13')),'official wiki rows should use the stable pageId when available');
assert.ok(rows.some(row=>(row.images||[]).some(image=>/notion-assets\/mining\/hero\.webp/.test(image.src||''))),'wiki image assets should be preserved');
assert.equal(rows.some(row=>/관리자|내부 설정/.test(`${row.title} ${row.text}`)),false,'ADMIN pages must not leak into public guide');

const byId=id=>items.find(item=>item.id===id);
const findBySource=id=>items.find(item=>(item.sources||[]).some(source=>source.id===id));
const diamond=findBySource('source-diamond-notion');
const money=byId('justserver-moneygame');
const survival=byId('justserver-survival');
assert.ok(diamond,'diamond Notion source missing from seed');
assert.ok(money,'moneygame content missing from seed');
assert.ok(survival,'survival content missing from seed');

assert.equal(internals.guideHydrationPlan(diamond).some(row=>row.kind==='notion'),true,'diamond should self-hydrate from Notion when Redis guide rows are missing');
const moneyPlan=internals.guideHydrationPlan(money);
assert.equal(moneyPlan.some(row=>row.kind==='notion'),true,'moneygame should self-hydrate from its legacy Notion source when Redis guide rows are missing');
assert.equal(moneyPlan.find(row=>row.kind==='notion')?.source?.url,'https://app.notion.com/p/217d57d6a55c80d68958c2ce1762308d','moneygame fallback must use the previously verified original Notion URL');
const survivalPlan=internals.guideHydrationPlan(survival);
assert.deepEqual(survivalPlan.map(row=>row.kind),['official-wiki'],'survival guide hydration must use only the official wiki');
assert.equal((survival.sources||[]).some(row=>internals.isNotionSourceUrl?.(row?.url)||row?.id==='source-survival-notion'),false,'survival seed must not expose the legacy Notion source');
assert.doesNotMatch(String(survival.description||''),/Notion/i,'survival public description must not advertise Notion as a source');
assert.equal((survival.timeline||[]).some(row=>row?.sourceId==='source-survival-notion'),false,'survival timeline must not reference the removed Notion source');
assert.doesNotMatch(JSON.stringify(survival),/Notion/i,'survival seed must not contain any user-visible Notion remnant');

const staleSurvival={
  ...survival,
  notionSections:[{id:'legacy-notion',title:'예전 Notion 가이드',text:'삭제되어야 합니다.',provider:'notion'}],
  notionSyncedAt:'2026-09-30T00:00:00.000Z',
  sources:[...(survival.sources||[]),{id:'source-survival-notion',kind:'reference',label:'legacy notion',url:'https://example.notion.site/legacy',visibility:'public'}],
  timeline:[...(survival.timeline||[]),{id:'legacy-date',title:'예전 일정',sourceId:'source-survival-notion',note:'Notion 기준 일정'}]
};
const sanitized=internals.sanitizeSurvivalGuideItem(staleSurvival);
assert.equal(Array.isArray(sanitized.notionSections)&&sanitized.notionSections.length>0,false,'stored survival Notion guide rows must be removed');
assert.equal('notionSyncedAt' in sanitized,false,'stored survival Notion sync metadata must be removed');
assert.equal((sanitized.sources||[]).some(row=>row?.id==='source-survival-notion'||internals.isNotionSourceUrl?.(row?.url)),false,'stored survival Notion sources must be removed');
assert.equal((sanitized.timeline||[]).some(row=>row?.sourceId==='source-survival-notion'),false,'stored survival timeline references must be remapped away from Notion');
assert.equal((sanitized.sources||[]).some(row=>row?.id==='source-survival-wiki'),true,'official survival wiki source must be present after sanitization');
assert.doesNotMatch(JSON.stringify(sanitized),/Notion/i,'stored survival content must be scrubbed of legacy Notion wording');

const apiSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');
const adapterSource=fs.readFileSync(new URL('../lib/content-guide-sources.js',import.meta.url),'utf8');
const clientSource=fs.readFileSync(new URL('../chunbong-contents.js',import.meta.url),'utf8');
assert.match(apiSource,/await hydrateGuideForPublicItem\(/,'public detail must self-hydrate a guide when Redis-backed sections are unavailable');
assert.match(apiSource,/refreshOfficialWikiGuides/,'scheduled archive sync must include official wiki guides');
assert.match(adapterSource,/api\/fansite-guide/,'official wiki sync must consume the structured feed exposed by the official wiki');
assert.match(adapterSource,/official_wiki_source_mismatch/,'any delivery fallback must verify that the payload identifies the official custom-domain source');
assert.match(adapterSource,/source:SURVIVAL_WIKI_ORIGIN/,'public source identity must remain the official custom-domain wiki even when delivery fallback is used');
assert.doesNotMatch(adapterSource,/<main|querySelector|cheerio/i,'official wiki adapter must not scrape rendered HTML');
assert.match(clientSource,/guideRowHasBody\([^)]*\).*row\.title/s,'heading-only guide rows must survive the client-side guide filter');
assert.match(clientSource,/provider==='official-wiki'[^\n]*공식 위키/,'official wiki rows should be labeled as official wiki in the guide UI');

console.log('content guide resilience regression: ok');
