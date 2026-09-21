import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const version=sw.match(/const CACHE_NAME = '([^']+)'/)?.[1]||'';
assert.ok(version,'service worker cache version missing');

const mismatches=[];
for(const name of fs.readdirSync(path.join(root,'tests'))){
  if(!name.endsWith('.mjs')||name==='pwa-cache-consistency-regression.mjs')continue;
  const text=fs.readFileSync(path.join(root,'tests',name),'utf8');
  for(const match of text.matchAll(/chunbong-pwa-\d{8}-v\d+/g)){
    if(match[0]!==version)mismatches.push(name+': '+match[0]+' != '+version);
  }
}
assert.deepEqual(mismatches,[],'stale PWA cache expectations:\n'+mismatches.join('\n'));
console.log('PWA cache expectation consistency regression passed:',version);
