import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('vercel.json'));
const headers=config.headers||[];
const headerMap=source=>Object.fromEntries((headers.find(x=>x.source===source)?.headers||[]).map(x=>[x.key.toLowerCase(),x.value]));

assert.equal(config.git?.deploymentEnabled?.main,true,'main Git deployments must stay enabled');
for(const branch of ['feat/*','fix/*','chore/*','ci/*','refactor/*','test/*','hotfix/*','internal/*','feature/*','perf/*']){
  assert.equal(config.git?.deploymentEnabled?.[branch],false,branch+' preview Git deployments must stay disabled');
}
assert.equal(config.ignoreCommand,'node .github/scripts/vercel-ignore-build.mjs','Vercel ignoreCommand changed');

const sw=headerMap('/service-worker.js');
assert.match(sw['cache-control']||'',/no-cache/,'service worker must not be cached');
assert.equal(sw['service-worker-allowed'],'/','service worker scope header changed');

const global=headerMap('/(.*)');
assert.equal(global['x-content-type-options'],'nosniff');
assert.equal(global['x-frame-options'],'SAMEORIGIN');
assert.equal(global['referrer-policy'],'strict-origin-when-cross-origin');
assert.match(global['strict-transport-security']||'',/max-age=31536000/);
assert.match(global['permissions-policy']||'',/camera=\(\)/);
assert.match(global['permissions-policy']||'',/microphone=\(\)/);
assert.match(global['permissions-policy']||'',/geolocation=\(\)/);

const redirect=(config.redirects||[]).find(x=>x.source==='/timeline.html');
assert.deepEqual(redirect,{source:'/timeline.html',destination:'/history.html',permanent:true});
for(const [source,destination] of [
 ['/contents/:id','/chunbong-contents.html?id=:id'],
 ['/api/operator/github/start','/api/content?type=operator-github-start'],
 ['/api/operator/github/callback','/api/content?type=operator-github-callback']
]){
 const rule=(config.rewrites||[]).find(x=>x.source===source);
 assert.equal(rule?.destination,destination,'rewrite changed: '+source);
}

const recovery=read('.github/workflows/production-prebuilt-recovery.yml');
assert.doesNotMatch(recovery,/vercel@latest/,'production recovery must pin Vercel CLI');
assert.match(recovery,/vercel@59\.19\.1/,'expected pinned Vercel CLI missing');
assert.match(recovery,/--prebuilt --prod/,'recovery must deploy the verified prebuilt artifact');
assert.match(recovery,/DEPLOY_COMMIT_SHA=\$GITHUB_SHA/,'recovery must stamp the deployed commit');
assert.match(recovery,/\/api\/version/,'recovery must verify production version');

const retry=read('.github/workflows/production-git-auto-retry.yml');
assert.match(retry,/RATE_LIMIT_AGE_SECONDS.*86400/s,'Git retry must respect the 24-hour rate-limit window');
assert.match(retry,/git commit --allow-empty/,'Git retry trigger behavior changed');
assert.match(retry,/needs_retry != 'true'/,'Git retry must preserve the no-op path');

const sync=read('.github/workflows/production-version-sync.yml');
assert.match(sync,/\/api\/version/,'version sync must query production version');
assert.match(sync,/RUNTIME_SYNCED/,'version sync must recognize runtime-only synchronization');

console.log('deployment safety regression passed');
