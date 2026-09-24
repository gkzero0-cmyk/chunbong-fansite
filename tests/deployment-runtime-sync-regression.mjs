import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {shouldIgnoreFiles} from '../.github/scripts/vercel-ignore-build.mjs';

const require=createRequire(import.meta.url);
const sync=require('../lib/deployment-sync.js');

const internalFiles=['.github/workflows/site-regression.yml','tests/example.mjs','docs/notes.md','scripts/build.mjs','README.md'];
for(const file of internalFiles){
  assert.equal(sync.isInternalPath(file),true,file+' should be non-deployment');
  assert.equal(shouldIgnoreFiles([file]),true,file+' must match Vercel ignore policy');
}
for(const file of ['index.html','operator.js','api/version.js','lib/operator-center-api.js','styles.css']){
  assert.equal(sync.isInternalPath(file),false,file+' should require a runtime deployment');
  assert.equal(shouldIgnoreFiles([file]),false,file+' must not be skipped by Vercel');
}
assert.equal(sync.runtimeSyncFromFiles(internalFiles),true);
assert.equal(sync.runtimeSyncFromFiles([...internalFiles,'operator.js']),false);

const internalCompare=await sync.compareDeploymentRuntime({
  deploymentSha:'a'.repeat(40),mainSha:'b'.repeat(40),
  fetchImpl:async()=>({ok:true,json:async()=>({status:'ahead',total_commits:2,files:[{filename:'tests/a.mjs'},{filename:'.github/workflows/a.yml'}]})})
});
assert.equal(internalCompare.exactSynced,false);
assert.equal(internalCompare.runtimeSynced,true);
assert.equal(internalCompare.internalOnlyGap,true);

const runtimeCompare=await sync.compareDeploymentRuntime({
  deploymentSha:'a'.repeat(40),mainSha:'c'.repeat(40),
  fetchImpl:async()=>({ok:true,json:async()=>({status:'ahead',total_commits:1,files:[{filename:'operator.js'}]})})
});
assert.equal(runtimeCompare.runtimeSynced,false);
assert.equal(runtimeCompare.internalOnlyGap,false);

const diverged=await sync.compareDeploymentRuntime({
  deploymentSha:'a'.repeat(40),mainSha:'d'.repeat(40),
  fetchImpl:async()=>({ok:true,json:async()=>({status:'diverged',total_commits:1,files:[{filename:'tests/a.mjs'}]})})
});
assert.equal(diverged.runtimeSynced,false,'diverged history must never be treated as safely synced');

const version=fs.readFileSync(new URL('../api/version.js',import.meta.url),'utf8');
assert.match(version,/exactSynced:sync\.exactSynced/);
assert.match(version,/runtimeSynced:sync\.runtimeSynced/);
assert.match(version,/internalOnlyGap:sync\.internalOnlyGap===true/);

const operatorApi=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
assert.match(operatorApi,/path==='\/api\/version'.*response\.json/s,'operator health must read the version payload');
assert.match(operatorApi,/versionState\.runtimeSynced/,'operator health must use runtime sync state');
assert.match(operatorApi,/internalOnlyGap/,'operator health must expose internal-only gap state');

const operator=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
assert.match(operator,/Production 사이트 코드 최신 상태/);
assert.match(operator,/CI\/테스트\/문서 변경만 배포를 생략했습니다/);
assert.match(operator,/사이트 코드 동기화/);

const workflow=fs.readFileSync(new URL('../.github/workflows/production-version-sync.yml',import.meta.url),'utf8');
assert.match(workflow,/runtimeSynced===true\|\|p\.synced===true/);
assert.match(workflow,/Production runtime is synced; only non-deployment files differ from main/);

console.log('deployment runtime sync regression passed');
