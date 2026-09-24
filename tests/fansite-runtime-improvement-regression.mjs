import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

const index=read('index.html');
const loader=read('home-fortune-loader.js');
const shell=read('site-shell.js');
const fanartPage=read('page-fanart.js');
const fanartApi=read('lib/content-api/fanart.js');
const contentApi=read('api/content.js');
const operatorHtml=read('operator.html');
const operatorJs=read('operator.js');
const vercel=JSON.parse(read('vercel.json'));

assert.doesNotMatch(index,/href="daily-fortune\.css/,'homepage must not block first paint on daily fortune CSS');
assert.doesNotMatch(index,/src="daily-fortune\.js/,'homepage must not parse the full daily fortune runtime synchronously');
assert.match(index,/home-fortune-loader\.js\?v=1/,'homepage lazy fortune loader missing');
assert.match(loader,/requestIdleCallback/,'daily fortune should warm during browser idle time');
assert.match(loader,/data-home-overview-fortune/,'daily fortune must still load immediately from the visible home card');
assert.match(loader,/daily-fortune\.css\?v=16/,'lazy loader must retain current daily fortune stylesheet version');
assert.match(loader,/daily-fortune\.js\?v=15/,'lazy loader must retain current daily fortune runtime version');

assert.match(shell,/peek\(key\)/,'shared cache needs a stale snapshot reader');
assert.match(shell,/staleIfError=false/,'shared cache must expose opt-in stale-on-error behavior');
assert.match(shell,/if\(staleIfError&&stale\)return stale/,'stale content must be returned only when explicitly requested');
assert.match(fanartPage,/ttl:15\*60\*1000,staleIfError:true/,'fanart list must use the warm stale-safe browser cache');
assert.match(fanartApi,/LIST_CACHE_TTL_MS=15\*60\*1000/,'fanart origin list cache must be fifteen minutes');
assert.match(contentApi,/Vercel-CDN-Cache-Control','fanart route must keep an explicit Vercel edge cache');
assert.match(contentApi,/max-age=900, stale-while-revalidate=3600/,'fanart list should use a fifteen-minute edge cache with stale fallback');

assert.match(operatorHtml,/id="operator-deployment-banner"/,'operator deployment banner missing');
assert.match(operatorHtml,/DEPLOYMENT STATUS/,'operator deployment banner must be immediately understandable');
assert.match(operatorJs,/function renderDeploymentBanner\(\)/,'operator deployment banner renderer missing');
assert.match(operatorJs,/Production 업데이트 대기/,'operator banner must surface unsynced production state');
assert.match(operatorJs,/Vercel 배포 제한/,'operator banner must surface deployment rate limiting');

assert.equal(vercel.git?.deploymentEnabled?.main,true,'main must remain deployable');
for(const key of ['feat/*','fix/*','chore/*','test/*','hotfix/*','feature/*','perf/*','refactor/*']){
  assert.equal(vercel.git?.deploymentEnabled?.[key],false,key+' must not auto-create Vercel previews');
}

console.log('fansite runtime improvement regression passed');
