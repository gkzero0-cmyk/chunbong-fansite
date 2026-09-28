import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const targets=[
  'data/chunbong-data-history.json',
  'data/trackify-soop-cache.json',
  'data/soop-follower-history.json',
  'data/youtube-engagement-cache.json',
  'data/soop-external-history.json',
  'data/soop-sessions.json'
];

function readJson(relative){
  const full=path.join(root,relative);
  const parsed=JSON.parse(fs.readFileSync(full,'utf8'));
  if(!parsed||typeof parsed!=='object')throw new Error(relative+' invalid');
  return parsed;
}
function nonEmpty(relative,value){
  if(relative.endsWith('chunbong-data-history.json'))return Array.isArray(value.snapshots)&&value.snapshots.length>0;
  if(relative.endsWith('trackify-soop-cache.json'))return Boolean(value.stats)||Array.isArray(value.sessions)&&value.sessions.length>0;
  if(relative.endsWith('soop-follower-history.json'))return Array.isArray(value.points)&&value.points.length>0;
  if(relative.endsWith('youtube-engagement-cache.json'))return Array.isArray(value.items)&&value.items.length>0;
  if(relative.endsWith('soop-external-history.json'))return Array.isArray(value.snapshots)||Array.isArray(value.items)||Object.keys(value).length>1;
  if(relative.endsWith('soop-sessions.json'))return Array.isArray(value.sessions)||Object.keys(value).length>0;
  return true;
}
function latestDate(value){
  const candidates=[];
  const walk=node=>{
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){for(const item of node)walk(item);return}
    for(const [key,child] of Object.entries(node)){
      if(/^(capturedAt|date|publishedAt|startedAt|updatedAt)$/i.test(key)){
        const time=Date.parse(String(child||''));if(Number.isFinite(time))candidates.push(time);
      }else if(child&&typeof child==='object')walk(child);
    }
  };
  walk(value);
  return candidates.length?Math.max(...candidates):null;
}
function rowCount(relative,value){
  if(relative.endsWith('chunbong-data-history.json'))return value.snapshots?.length||0;
  if(relative.endsWith('trackify-soop-cache.json'))return value.sessions?.length||0;
  if(relative.endsWith('soop-follower-history.json'))return value.points?.length||0;
  if(relative.endsWith('youtube-engagement-cache.json'))return value.items?.length||0;
  if(relative.endsWith('soop-external-history.json'))return value.snapshots?.length||value.items?.length||0;
  if(relative.endsWith('soop-sessions.json'))return value.sessions?.length||0;
  return Object.keys(value||{}).length;
}

const data={},integrity={};
const now=Date.now(),maxStaleMs=90*86400000;
for(const relative of targets){
  const value=readJson(relative);
  if(!nonEmpty(relative,value))throw new Error(relative+' empty; refusing to replace last-known-good');
  const serialized=JSON.stringify(value),latest=latestDate(value),rows=rowCount(relative,value);
  if(latest&&now-latest>maxStaleMs)throw new Error(relative+' is older than 90 days; refusing recovery snapshot');
  integrity[relative]={
    rows,
    bytes:Buffer.byteLength(serialized),
    sha256:crypto.createHash('sha256').update(serialized).digest('hex'),
    latestAt:latest?new Date(latest).toISOString():null
  };
  data[relative]=value;
}
const payload={
  version:2,
  capturedAt:new Date().toISOString(),
  sources:targets,
  integrity,
  data
};
const out=path.join(root,'data','last-known-good.json');
const tmp=out+'.tmp';
fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n');
fs.renameSync(tmp,out);
console.log('LAST_KNOWN_GOOD_SOURCES='+targets.length);
console.log('LAST_KNOWN_GOOD_CAPTURED_AT='+payload.capturedAt);
