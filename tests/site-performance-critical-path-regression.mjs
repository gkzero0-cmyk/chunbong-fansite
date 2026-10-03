import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('site-shell.js');
const minigames=read('minigames.html');
const changelog=read('changelog.html');
const minigameLoader=read('minigame-profile-loader.js');

assert.ok(shell.length<14000,'site-shell.js critical core must stay below 14KB');
assert.doesNotMatch(shell,/\n\s*pruneSnapshots\(\);/,'site shell must not synchronously prune all snapshots at startup');
const writeSnapshot=(shell.match(/function writeSnapshot\([\s\S]*?\n\s*\}/)||[''])[0];
assert.ok(writeSnapshot,'writeSnapshot helper missing');
assert.doesNotMatch(writeSnapshot,/pruneSnapshots\(\)/,'snapshot writes must schedule pruning instead of scanning localStorage synchronously');
assert.match(shell,/site-shell-idle\.js/,'non-critical runtimes must be reached through the idle shell loader');
for(const eager of ['site-health.js','site-improvements.js','site-meta.js']){
  assert.doesNotMatch(shell,new RegExp("loadScript\\(['\"]"+eager.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),'site-shell must not eagerly load '+eager);
}
assert.doesNotMatch(minigames,/src="content\.js(?:\?[^\"]*)?"/,'minigames hub must not load the general content bundle');
assert.doesNotMatch(changelog,/src="content\.js(?:\?[^\"]*)?"/,'changelog must not load the general content bundle');
assert.ok(/ChunbongNavigationPrefetch/.test(shell)||/site-shell-idle\.js/.test(shell),'navigation prefetch runtime must be reachable');
assert.doesNotThrow(()=>new Function(minigameLoader),'minigame profile loader must be valid JavaScript');
assert.ok(minigameLoader.length<1500,'minigame profile loader must stay tiny');

let idle='';
try{idle=read('site-shell-idle.js')}catch{}
assert.ok(idle,'site-shell-idle.js must exist');
assert.doesNotThrow(()=>new Function(idle),'site-shell-idle.js must be valid JavaScript');
assert.match(idle,/saveData/,'navigation prefetch must honor Save-Data');
assert.match(idle,/slow-2g|2g/,'navigation prefetch must block 2G-class connections');
assert.match(idle,/same-origin|location\.origin|url\.origin/,'navigation prefetch must be same-origin only');
assert.match(idle,/pointerenter/,'navigation prefetch must use pointer intent');
assert.match(idle,/focusin/,'navigation prefetch must support keyboard intent');
assert.match(idle,/touchstart/,'navigation prefetch must support touch intent');

console.log('site performance critical path regression passed');
