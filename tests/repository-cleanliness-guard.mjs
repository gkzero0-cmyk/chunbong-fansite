import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','node_modules']);
const suspicious=[];
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(ignored.has(e.name))continue;
  const full=path.join(dir,e.name),rel=path.relative(root,full).replaceAll('\\','/');
  if(e.isDirectory())walk(full);
  else if(/(?:~|\.bak|\.backup|\.orig|\.rej|\.tmp|\.swp)$/i.test(e.name)||/(?:^|\/)\.DS_Store$/.test(rel))suspicious.push(rel);
 }
}
walk(root);
assert.deepEqual(suspicious,[],'temporary/backup files must not ship: '+suspicious.join(', '));
for(const marker of ['.github/vercel-redeploy-recovery.txt','.github/recovery/production-prebuilt.trigger']){
 const full=path.join(root,marker);
 if(fs.existsSync(full))assert.ok(fs.statSync(full).size<4096,marker+' recovery marker unexpectedly large');
}
console.log('repository cleanliness guard passed');
