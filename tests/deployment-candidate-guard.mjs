import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const critical=[
 'index.html','schedule.html','tarot.html','chunbong-contents.html','fanart.html',
 'page.js','service-worker.js','manifest.webmanifest','vercel.json'
];
for(const file of critical)assert.ok(read(file).length>100,file+' deployment-critical file unexpectedly small');
const version=read('api/version.js');
assert.match(version,/VERCEL_GIT_COMMIT_SHA/);
assert.match(version,/DEPLOY_COMMIT_SHA/);
assert.match(version,/runtimeSynced|synced/,'version endpoint must expose synchronization state');
const sync=read('.github/workflows/production-version-sync.yml');
assert.match(sync,/EXPECTED="\$\(git rev-parse HEAD\)"/,'production verification must bind to checked-out candidate SHA');
assert.match(sync,/ACTUAL=/,'production verification must read deployed SHA');
const retry=read('.github/workflows/production-git-auto-retry.yml');
assert.match(retry,/git reset --hard origin\/main/,'retry must evaluate the current main candidate');
console.log('deployment candidate guard passed');
