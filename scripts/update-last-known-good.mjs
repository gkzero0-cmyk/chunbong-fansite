import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const data={};
for(const relative of targets){
  const value=readJson(relative);
  if(!nonEmpty(relative,value))throw new Error(relative+' empty; refusing to replace last-known-good');
  data[relative]=value;
}
const payload={
  version:1,
  capturedAt:new Date().toISOString(),
  sources:targets,
  data
};
const out=path.join(root,'data','last-known-good.json');
const tmp=out+'.tmp';
fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n');
fs.renameSync(tmp,out);
console.log('LAST_KNOWN_GOOD_SOURCES='+targets.length);
console.log('LAST_KNOWN_GOOD_CAPTURED_AT='+payload.capturedAt);
