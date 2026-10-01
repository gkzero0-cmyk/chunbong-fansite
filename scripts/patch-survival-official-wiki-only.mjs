import fs from 'node:fs';

const apiPath='lib/chunbong-content-archive-api.js';
let api=fs.readFileSync(apiPath,'utf8');

const hydrateAnchor=`async function hydrateGuideForPublicItem(item={}){\n  if(!item?.id||hasGuideBody(item))return item;\n  const key=String(item.id),now=Date.now(),cached=publicGuideCache.get(key);`;
const hydrateReplacement=`function sanitizeSurvivalGuideItem(item={}){\n  if(String(item?.id||'')!=='justserver-survival')return item;\n  const previousSources=Array.isArray(item.sources)?item.sources:[];\n  const sources=previousSources.filter(source=>String(source?.id||'')!=='source-survival-notion'&&!guideSources.isNotionSourceUrl(source?.url));\n  const officialSource={...guideSources.SURVIVAL_WIKI_SOURCE};\n  const hasOfficial=sources.some(source=>String(source?.id||'')===officialSource.id||guideSources.isOfficialWikiSourceUrl(source?.url));\n  const nextSources=hasOfficial?sources:[...sources,officialSource];\n  const previousTimeline=Array.isArray(item.timeline)?item.timeline:[];\n  const timeline=previousTimeline.map(row=>row&&String(row.sourceId||'')==='source-survival-notion'?{...row,sourceId:officialSource.id}:row);\n  const description=String(item.description||'')\n    .replace(/공식 자료와 공개 Notion 스냅샷을 바탕으로/gi,'공식 자료와 공식 위키를 바탕으로')\n    .replace(/공개 Notion 스냅샷/gi,'공식 위키');\n  const hadNotionSections=Array.isArray(item.notionSections)&&item.notionSections.length>0;\n  const hadNotionSyncedAt=Object.prototype.hasOwnProperty.call(item,'notionSyncedAt');\n  const sourceChanged=nextSources.length!==previousSources.length||nextSources.some((source,index)=>source!==previousSources[index]);\n  const timelineChanged=timeline.some((row,index)=>row!==previousTimeline[index]);\n  const descriptionChanged=description!==String(item.description||'');\n  if(!hadNotionSections&&!hadNotionSyncedAt&&!sourceChanged&&!timelineChanged&&!descriptionChanged)return item;\n  const next={...item,sources:nextSources,timeline,description};\n  delete next.notionSections;delete next.notionSyncedAt;\n  return next;\n}\nfunction sanitizeSurvivalGuideRows(rows=[]){\n  const changedIds=[];\n  const next=rows.map(item=>{const clean=sanitizeSurvivalGuideItem(item);if(clean!==item&&item?.id)changedIds.push(item.id);return clean});\n  return{rows:next,changedIds};\n}\nasync function hydrateGuideForPublicItem(item={}){\n  item=sanitizeSurvivalGuideItem(item);\n  if(!item?.id||hasGuideBody(item))return item;\n  const key=String(item.id),now=Date.now(),cached=publicGuideCache.get(key);`;
if(!api.includes('function sanitizeSurvivalGuideItem(item={}){')){
  if(!api.includes(hydrateAnchor))throw new Error('hydrate anchor missing');
  api=api.replace(hydrateAnchor,hydrateReplacement);
}

const guideRefreshAnchor=`async function refreshGuideDocumentsOnly({force=true}={}){\n  if(!hasRedis())throw new Error('archive_storage_unavailable');\n  const startedAt=new Date().toISOString(),startedMs=Date.now(),rows=await adminRows();\n  const notion=await refreshNotionGuides(rows,{force});`;
const guideRefreshReplacement=`async function refreshGuideDocumentsOnly({force=true}={}){\n  if(!hasRedis())throw new Error('archive_storage_unavailable');\n  const startedAt=new Date().toISOString(),startedMs=Date.now(),sanitized=sanitizeSurvivalGuideRows(await adminRows()),rows=sanitized.rows;\n  const notion=await refreshNotionGuides(rows,{force});`;
if(api.includes(guideRefreshAnchor))api=api.replace(guideRefreshAnchor,guideRefreshReplacement);
else if(!api.includes('sanitized=sanitizeSurvivalGuideRows(await adminRows())'))throw new Error('guide refresh anchor missing');

const guideChangedAnchor=`  const changedIds=[...new Set([...notion.changedIds,...references.changedIds,...officialWiki.changedIds])];`;
const guideChangedReplacement=`  const changedIds=[...new Set([...sanitized.changedIds,...notion.changedIds,...references.changedIds,...officialWiki.changedIds])];`;
if(api.includes(guideChangedAnchor))api=api.replace(guideChangedAnchor,guideChangedReplacement);
else if(!api.includes('...sanitized.changedIds,...notion.changedIds'))throw new Error('guide changedIds anchor missing');

const autoAnchor=`    const applied=autoIngest.attachOfficialDiscoveries(rows,discovery.materials);\n    const notion=await refreshNotionGuides(applied.rows,{force});`;
const autoReplacement=`    const applied=autoIngest.attachOfficialDiscoveries(rows,discovery.materials);\n    const survivalSanitized=sanitizeSurvivalGuideRows(applied.rows);\n    applied.rows=survivalSanitized.rows;\n    applied.changedIds=[...new Set([...(applied.changedIds||[]),...survivalSanitized.changedIds])];\n    const notion=await refreshNotionGuides(applied.rows,{force});`;
if(api.includes(autoAnchor))api=api.replace(autoAnchor,autoReplacement);
else if(!api.includes('survivalSanitized=sanitizeSurvivalGuideRows(applied.rows)'))throw new Error('auto sync anchor missing');

const exportAnchor=`officialWikiGuideRows:guideSources.officialWikiGuideRows,guideHydrationPlan:guideSources.guideHydrationPlan,hydrateGuideForPublicItem,AUTO_FULL_MIGRATION_KEY`;
const exportReplacement=`officialWikiGuideRows:guideSources.officialWikiGuideRows,guideHydrationPlan:guideSources.guideHydrationPlan,isNotionSourceUrl:guideSources.isNotionSourceUrl,sanitizeSurvivalGuideItem,hydrateGuideForPublicItem,AUTO_FULL_MIGRATION_KEY`;
if(api.includes(exportAnchor))api=api.replace(exportAnchor,exportReplacement);
else if(!api.includes('sanitizeSurvivalGuideItem,hydrateGuideForPublicItem'))throw new Error('internals export anchor missing');

fs.writeFileSync(apiPath,api);

const seedPath='data/chunbong-contents-seed.json';
const seedRaw=fs.readFileSync(seedPath,'utf8');
const seed=JSON.parse(seedRaw);
const items=Array.isArray(seed)?seed:seed.items;
if(!Array.isArray(items))throw new Error('seed items missing');
const survival=items.find(item=>String(item?.id||'')==='justserver-survival');
if(!survival)throw new Error('survival seed item missing');

survival.description=String(survival.description||'')
  .replace(/공식 자료와 공개 Notion 스냅샷을 바탕으로/gi,'공식 자료와 공식 위키를 바탕으로')
  .replace(/공개 Notion 스냅샷/gi,'공식 위키');
survival.sources=(Array.isArray(survival.sources)?survival.sources:[])
  .filter(source=>String(source?.id||'')!=='source-survival-notion'&&!/notion\.(?:so|site)$/i.test((()=>{try{return new URL(String(source?.url||'')).hostname}catch{return''}})()));
if(!survival.sources.some(source=>String(source?.id||'')==='source-survival-wiki')){
  survival.sources.push({id:'source-survival-wiki',kind:'reference',label:'그냥서버 적자생존 공식 위키',url:'https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/',visibility:'public'});
}
if(Array.isArray(survival.timeline))survival.timeline=survival.timeline.map(row=>row&&String(row.sourceId||'')==='source-survival-notion'?{...row,sourceId:'source-survival-wiki'}:row);
delete survival.notionSections;delete survival.notionSyncedAt;

const nextSeed=JSON.stringify(seed,null,2)+'\n';
fs.writeFileSync(seedPath,nextSeed);
console.log('survival guide migrated to official wiki only');
