import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
assert.match(sw,/const CACHE_PREFIX = 'chunbong-pwa-'/,'service worker cache prefix missing');
assert.match(sw,/const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/,'service worker cache must be deployment-aware');

const stale=[];
for(const name of fs.readdirSync(path.join(root,'tests'))){
  if(!name.endsWith('.mjs'))continue;
  const source=fs.readFileSync(path.join(root,'tests',name),'utf8');
  for(const match of source.matchAll(/chunbong-pwa-\d{8}-v\d+/g))stale.push(name+': '+match[0]);
}
assert.deepEqual(stale,[],'dated PWA cache literals must not return:\n'+stale.join('\n'));
console.log('deployment-aware PWA cache consistency passed');
