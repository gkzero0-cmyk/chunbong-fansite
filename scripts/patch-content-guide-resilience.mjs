import fs from 'node:fs';

const path='lib/chunbong-content-archive-api.js';
let source=fs.readFileSync(path,'utf8');
const replaceOnce=(from,to,label)=>{
  if(source.includes(to))return;
  if(!source.includes(from))throw new Error(`missing patch anchor: ${label}`);
  source=source.replace(from,to);
};

replaceOnce(
"const pushNotifications=require('./push-notifications-api');\nconst {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;",
"const pushNotifications=require('./push-notifications-api');\nconst guideSources=require('./content-guide-sources');\nconst {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;",
'guide source require'
);

const hydration=`\nconst PUBLIC_GUIDE_CACHE_TTL_MS=15*60*1000;\nconst publicGuideCache=new Map(),publicGuideInflight=new Map();\nfunction hasGuideBody(item={}){\n  return ['notionSections','referenceSections','knowledgeSections'].some(key=>(Array.isArray(item[key])?item[key]:[]).some(row=>String(row?.text||row?.description||'').trim()||(row?.images||[]).length||(row?.content||[]).length));\n}\nfunction attachGuideSource(item={},source={}){\n  const sources=Array.isArray(item.sources)?item.sources:[];\n  if(!source?.id||sources.some(row=>String(row?.id||'')===String(source.id)))return item;\n  return{...item,sources:[...sources,source]};\n}\nasync function hydrateGuideForPublicItem(item={}){\n  if(!item?.id||hasGuideBody(item))return item;\n  const key=String(item.id),now=Date.now(),cached=publicGuideCache.get(key);\n  if(cached&&cached.expiresAt>now)return cached.item;\n  if(publicGuideInflight.has(key))return publicGuideInflight.get(key);\n  const task=(async()=>{\n    let hydrated=item;\n    for(const plan of guideSources.guideHydrationPlan(item)){\n      try{\n        if(plan.kind==='official-wiki'){\n          const fetched=await guideSources.fetchOfficialWikiIndex(plan.source,{timeoutMs:10000});\n          const rows=guideSources.officialWikiGuideRows(fetched.payload,plan.source);\n          if(rows.length){hydrated=attachGuideSource({...item,referenceSections:rows,referenceSyncedAt:fetched.generatedAt||new Date().toISOString()},plan.source);break}\n        }else if(plan.kind==='notion'){\n          const meta=await fetchSourceMeta(plan.source.url);\n          const rows=notionGuideRows(meta,plan.source);\n          if(rows.length){hydrated={...item,notionSections:rows,notionSyncedAt:new Date().toISOString()};break}\n        }\n      }catch{}\n    }\n    publicGuideCache.set(key,{item:hydrated,expiresAt:Date.now()+PUBLIC_GUIDE_CACHE_TTL_MS});\n    return hydrated;\n  })().finally(()=>publicGuideInflight.delete(key));\n  publicGuideInflight.set(key,task);return task;\n}\n`;
replaceOnce(
"async function refreshNotionGuides(rows=[],{force=false}={}){",
hydration+"\nasync function refreshNotionGuides(rows=[],{force=false}={}){",
'public guide hydration'
);

replaceOnce(
"    const next=[];let successCount=0;\n    for(const source of sources){",
"    const namuSourceIds=new Set(sources.map(source=>String(source.id||'')));\n    const next=previous.filter(row=>String(row?.provider||'')!=='namuwiki'&&!namuSourceIds.has(String(row?.sourceId||'')));let successCount=0;\n    for(const source of sources){",
'preserve non namu reference guides'
);

const officialRefresh=`\nasync function refreshOfficialWikiGuides(rows=[],{force=false}={}){\n  const changedIds=new Set(),failures=[],details=[];let skippedCount=0;\n  for(const item of rows){\n    const plans=guideSources.guideHydrationPlan(item).filter(plan=>plan.kind==='official-wiki');\n    if(!plans.length)continue;\n    const previous=Array.isArray(item.referenceSections)?item.referenceSections:[];\n    const sourceIds=new Set(plans.map(plan=>String(plan.source?.id||'')));\n    const next=previous.filter(row=>String(row?.provider||'')!=='official-wiki'&&!sourceIds.has(String(row?.sourceId||'')));\n    let successCount=0,sourceAdded=false;\n    for(const plan of plans){\n      const source=plan.source||{},sourceId=String(source.id||''),previousRows=previous.filter(row=>String(row?.provider||'')==='official-wiki'&&String(row?.sourceId||'')===sourceId);\n      const stateField=sourceStateField('official-wiki',item.id,source);\n      try{\n        const previousState=force?{}:await readSourceState(stateField);\n        const fetched=await guideSources.fetchOfficialWikiIndex(source);\n        if(!force&&previousState?.fingerprint&&previousState.fingerprint===fetched.fingerprint&&previousRows.length){\n          next.push(...previousRows);successCount++;skippedCount++;\n          await writeSourceState(stateField,{...previousState,checkedAt:new Date().toISOString(),generatedAt:fetched.generatedAt,unchangedChecks:Number(previousState?.unchangedChecks||0)+1});\n          details.push({itemId:item.id,sourceId,sectionCount:previousRows.length,skipped:true,reason:'fingerprint',fingerprint:fetched.fingerprint.slice(0,16)});\n        }else{\n          const guideRows=guideSources.officialWikiGuideRows(fetched.payload,source);\n          if(!guideRows.length)throw new Error('official_wiki_empty_guide');\n          next.push(...guideRows);successCount++;\n          await writeSourceState(stateField,{fingerprint:fetched.fingerprint,generatedAt:fetched.generatedAt,checkedAt:new Date().toISOString(),lastChangedAt:new Date().toISOString(),unchangedChecks:0,sectionCount:guideRows.length});\n          details.push({itemId:item.id,sourceId,sectionCount:guideRows.length,skipped:false,reason:'changed',fingerprint:fetched.fingerprint.slice(0,16),generatedAt:fetched.generatedAt});\n        }\n        if(!(item.sources||[]).some(row=>String(row?.id||'')===sourceId)){item.sources=[...(item.sources||[]),source];sourceAdded=true}\n      }catch(error){next.push(...previousRows);failures.push({itemId:item.id,sourceId,error:String(error?.message||'official_wiki_sync_failed')})}\n    }\n    const normalizedNext=next.slice(0,200),before=JSON.stringify(previous),after=JSON.stringify(normalizedNext);\n    if(before!==after){item.referenceSections=normalizedNext;item.referenceSyncedAt=new Date().toISOString();changedIds.add(item.id)}\n    else if((successCount&&normalizedNext.length&&!item.referenceSyncedAt)||sourceAdded){if(!item.referenceSyncedAt)item.referenceSyncedAt=new Date().toISOString();changedIds.add(item.id)}\n  }\n  return{rows,changedIds:[...changedIds],failures,details,skippedCount};\n}\n`;
replaceOnce(
"async function saveChangedArchiveRows(rows=[],changedIds=[],completedAt=new Date().toISOString(),score=Date.now()){",
officialRefresh+"\nasync function saveChangedArchiveRows(rows=[],changedIds=[],completedAt=new Date().toISOString(),score=Date.now()){",
'official wiki refresh'
);

replaceOnce(
"  const notion=await refreshNotionGuides(rows,{force});\n  const references=await refreshReferenceGuides(notion.rows,{force});\n  const changedIds=[...new Set([...notion.changedIds,...references.changedIds])];\n  const completedAt=new Date().toISOString();\n  await saveChangedArchiveRows(references.rows,changedIds,completedAt,startedMs);",
"  const notion=await refreshNotionGuides(rows,{force});\n  const references=await refreshReferenceGuides(notion.rows,{force});\n  const officialWiki=await refreshOfficialWikiGuides(references.rows,{force});\n  const changedIds=[...new Set([...notion.changedIds,...references.changedIds,...officialWiki.changedIds])];\n  const completedAt=new Date().toISOString();\n  await saveChangedArchiveRows(officialWiki.rows,changedIds,completedAt,startedMs);",
'guide-only official wiki sync'
);
replaceOnce(
"    references:{changedItemCount:references.changedIds.length,sourceCount:references.details.length,skippedUnchanged:Number(references.skippedCount||0),failureCount:references.failures.length,details:references.details.slice(0,20),failures:references.failures.slice(0,20)}\n  };",
"    references:{changedItemCount:references.changedIds.length,sourceCount:references.details.length,skippedUnchanged:Number(references.skippedCount||0),failureCount:references.failures.length,details:references.details.slice(0,20),failures:references.failures.slice(0,20)},\n    officialWiki:{changedItemCount:officialWiki.changedIds.length,sourceCount:officialWiki.details.length,skippedUnchanged:Number(officialWiki.skippedCount||0),failureCount:officialWiki.failures.length,details:officialWiki.details.slice(0,20),failures:officialWiki.failures.slice(0,20)}\n  };",
'guide-only official wiki summary'
);

replaceOnce(
"    const notion=await refreshNotionGuides(applied.rows,{force});\n    const referenceGuides=await refreshReferenceGuides(notion.rows,{force});\n    const internalReferences=await refreshInternalReferenceSources(referenceGuides.rows);\n    const changed=new Set([...applied.changedIds,...notion.changedIds,...referenceGuides.changedIds,...internalReferences.changedIds]);",
"    const notion=await refreshNotionGuides(applied.rows,{force});\n    const referenceGuides=await refreshReferenceGuides(notion.rows,{force});\n    const officialWiki=await refreshOfficialWikiGuides(referenceGuides.rows,{force});\n    const internalReferences=await refreshInternalReferenceSources(officialWiki.rows);\n    const changed=new Set([...applied.changedIds,...notion.changedIds,...referenceGuides.changedIds,...officialWiki.changedIds,...internalReferences.changedIds]);",
'auto sync official wiki'
);
replaceOnce(
"      sourcePriority:['SOOP','YouTube','Notion','나무위키'],discovered:discovery.counts,scanMode:discovery.scanMode||'incremental',",
"      sourcePriority:['SOOP','YouTube','Notion','공식 위키','나무위키'],discovered:discovery.counts,scanMode:discovery.scanMode||'incremental',",
'auto sync source priority'
);
replaceOnce(
"      references:{changedItemCount:referenceGuides.changedIds.length,sourceCount:referenceGuides.details.length,skippedUnchanged:Number(referenceGuides.skippedCount||0),failureCount:referenceGuides.failures.length,details:referenceGuides.details.slice(0,20),failures:referenceGuides.failures.slice(0,20)},\n      internalReferences:{changedItemCount:internalReferences.changedIds.length,sourceCount:internalReferences.details.length,failureCount:internalReferences.failures.length},",
"      references:{changedItemCount:referenceGuides.changedIds.length,sourceCount:referenceGuides.details.length,skippedUnchanged:Number(referenceGuides.skippedCount||0),failureCount:referenceGuides.failures.length,details:referenceGuides.details.slice(0,20),failures:referenceGuides.failures.slice(0,20)},\n      officialWiki:{changedItemCount:officialWiki.changedIds.length,sourceCount:officialWiki.details.length,skippedUnchanged:Number(officialWiki.skippedCount||0),failureCount:officialWiki.failures.length,details:officialWiki.details.slice(0,20),failures:officialWiki.failures.slice(0,20)},\n      internalReferences:{changedItemCount:internalReferences.changedIds.length,sourceCount:internalReferences.details.length,failureCount:internalReferences.failures.length},",
'auto sync official wiki summary'
);
replaceOnce(
"      sourcePriority:['SOOP','YouTube','Notion','나무위키']",
"      sourcePriority:['SOOP','YouTube','Notion','공식 위키','나무위키']",
'failure source priority'
);

replaceOnce(
"async function handlePublicDetail(req,res){\n  const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';\n  const item=(await storedRows()).find(row=>row.id===id);\n  return item?send(res,200,{item,source:'chunbong-content'}):send(res,404,{error:'content_not_found'});\n}",
"async function handlePublicDetail(req,res){\n  const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';\n  const item=(await storedRows()).find(row=>row.id===id);\n  if(!item)return send(res,404,{error:'content_not_found'});\n  const hydrated=await hydrateGuideForPublicItem(item);\n  return send(res,200,{item:hydrated,source:'chunbong-content',guideFallback:hydrated!==item&&!hasRedis()});\n}",
'public detail hydration'
);

replaceOnce(
"persistReferenceGuideMedia,refreshNotionGuides,refreshGuideDocumentsOnly,saveChangedArchiveRows,isNotionSourceUrl",
"persistReferenceGuideMedia,refreshNotionGuides,refreshOfficialWikiGuides,refreshGuideDocumentsOnly,saveChangedArchiveRows,isNotionSourceUrl",
'export official refresh'
);
replaceOnce(
"shouldForcePublicAutoSync,explicitSameOrigin,AUTO_FULL_MIGRATION_KEY,AUTO_GUIDE_MEDIA_MIGRATION_KEY}",
"shouldForcePublicAutoSync,explicitSameOrigin,officialWikiGuideRows:guideSources.officialWikiGuideRows,guideHydrationPlan:guideSources.guideHydrationPlan,hydrateGuideForPublicItem,AUTO_FULL_MIGRATION_KEY,AUTO_GUIDE_MEDIA_MIGRATION_KEY}",
'export hydration internals'
);

fs.writeFileSync(path,source);

const workflow='.github/workflows/site-regression.yml';
let ci=fs.readFileSync(workflow,'utf8');
if(!ci.includes('node --check lib/content-guide-sources.js')){
  ci=ci.replace('          node --check lib/chunbong-content-archive-api.js\n','          node --check lib/chunbong-content-archive-api.js\n          node --check lib/content-guide-sources.js\n');
  fs.writeFileSync(workflow,ci);
}
console.log('patched content guide resilience and official wiki sync');
