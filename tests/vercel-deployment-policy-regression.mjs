import fs from 'node:fs';
import assert from 'node:assert/strict';
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.deepEqual(config.git?.deploymentEnabled,{'*':false,main:true},'automatic Git deployments must be limited to main so preview branches do not consume the daily deployment quota');
assert.match(String(config.ignoreCommand||''),/vercel-ignore-build/,'internal-only changes must still be eligible for ignored builds');
console.log('vercel deployment policy regression passed');
