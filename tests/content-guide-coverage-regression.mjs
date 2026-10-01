import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const seed=require('../data/chunbong-contents-seed.json');
const guides=require('../lib/content-guide-sources.js');

const items=Array.isArray(seed)?seed:(seed.items||[]);
const hasGuideBody=item=>['notionSections','referenceSections','knowledgeSections'].some(key=>(Array.isArray(item?.[key])?item[key]:[]).some(row=>String(row?.text||row?.description||'').trim()||(row?.images||[]).length||(row?.content||[]).length));
const isNamu=url=>{try{return /(^|\.)namu\.wiki$/i.test(new URL(String(url||'')).hostname)||/(^|\.)i\.namu\.wiki$/i.test(new URL(String(url||'')).hostname)}catch{return false}};
const guideSource=item=>(item.sources||[]).some(source=>guides.isNotionSourceUrl(source?.url)||guides.isOfficialWikiSourceUrl(source?.url)||isNamu(source?.url));
const guideExpected=item=>/^justserver-/i.test(String(item?.id||''))||/레오펠/.test([item?.title,item?.series?.title,...(item?.aliases||[])].filter(Boolean).join(' '))||guideSource(item);

const audited=[];const unresolved=[];
for(const item of items.filter(guideExpected)){
  const plan=guides.guideHydrationPlan(item);
  const sources=(item.sources||[]).filter(source=>guides.isNotionSourceUrl(source?.url)||guides.isOfficialWikiSourceUrl(source?.url)||isNamu(source?.url)).map(source=>({id:source.id,url:source.url}));
  const row={id:item.id,title:item.title,seedBody:hasGuideBody(item),plans:plan.map(entry=>entry.kind),sources};
  audited.push(row);
  if(!row.seedBody&&!row.plans.length)unresolved.push(row);
}

console.log(JSON.stringify({auditedCount:audited.length,unresolved},null,2));
assert.ok(audited.some(row=>row.id==='justserver-diamond'&&row.plans.includes('notion')),'diamond guide recovery plan missing');
assert.ok(audited.some(row=>row.id==='justserver-moneygame'&&row.plans.includes('notion')),'moneygame guide recovery plan missing');
assert.ok(audited.some(row=>row.id==='justserver-survival'&&row.plans.includes('official-wiki')),'survival official wiki recovery plan missing');
assert.deepEqual(unresolved,[],'guide-visible content must not depend exclusively on Redis-backed guide sections');
console.log('content guide coverage regression: ok');
