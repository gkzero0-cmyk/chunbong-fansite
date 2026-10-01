import fs from 'node:fs';
const path='lib/chunbong-content-archive-api.js';
let source=fs.readFileSync(path,'utf8');
const from=`        }else if(plan.kind==='notion'){
          const meta=await fetchSourceMeta(plan.source.url);
          const rows=notionGuideRows(meta,plan.source);
          if(rows.length){hydrated={...item,notionSections:rows,notionSyncedAt:new Date().toISOString()};break}
        }`;
const to=`        }else if(plan.kind==='notion'){
          const meta=await fetchSourceMeta(plan.source.url);
          const rows=notionGuideRows(meta,plan.source);
          if(rows.length){hydrated={...item,notionSections:rows,notionSyncedAt:new Date().toISOString()};break}
        }else if(plan.kind==='namuwiki'){
          const meta=await fetchNamuSourceMeta(plan.source.url);
          const rows=referenceGuideRows(meta,plan.source,'namuwiki');
          if(rows.length){hydrated={...item,referenceSections:rows,referenceSyncedAt:new Date().toISOString()};break}
        }`;
if(!source.includes(to)){
  if(!source.includes(from))throw new Error('guide hydration branch anchor missing');
  source=source.replace(from,to);
}
source=source.replace("guideFallback:hydrated!==item&&!hasRedis()","guideFallback:hydrated!==item");
fs.writeFileSync(path,source);
console.log('added namuwiki self-hydration and corrected guideFallback metadata');
