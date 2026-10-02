import assert from 'node:assert/strict';
import fs from 'node:fs';

const userscript=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const guard=fs.readFileSync(new URL('../operator-soop-recapture-guard.js',import.meta.url),'utf8');
const vercel=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

const operatorRedirect=(vercel.redirects||[]).find(row=>row?.source==='/operator.html');
assert.equal(operatorRedirect?.destination,'/operator','Production redirects /operator.html to the canonical /operator route');

for(const origin of [
  'https://chunbong-fansite.vercel.app',
  'https://chunbong-fansite-git-main-gkzero0-9465.vercel.app',
  'https://chunbong-fansite-gkzero0-9465.vercel.app'
]){
  const escaped=origin.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(userscript,new RegExp('\\/\\/ @match\\s+'+escaped+'\\/operator\\*'),'userscript must inject on canonical /operator as well as /operator.html');
}

assert.match(userscript,/\/\/ @version\s+1\.4\.7\b/,'route coverage fix must bump the userscript version so Tampermonkey installs it');
assert.match(userscript,/const VERSION='1\.4\.7'/,'runtime collector version must match userscript metadata');
assert.match(guard,/MIN_COLLECTOR_VERSION='1\.4\.7'/,'operator handshake must require the route-fixed collector version');

console.log('SOOP collector canonical operator route regression passed');
