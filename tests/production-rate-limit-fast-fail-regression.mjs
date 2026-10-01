import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const gate=read('.github/scripts/production-readiness-gate.mjs');
const workflows=[
  '.github/workflows/activity-center-production-smoke.yml',
  '.github/workflows/chungwagame-production-smoke.yml',
  '.github/workflows/chuncortile-production-smoke.yml',
  '.github/workflows/pwa-production-smoke.yml',
  '.github/workflows/production-version-sync.yml',
  '.github/workflows/visual-production-check.yml'
];

assert.match(gate,/status\.context==='Vercel'/,'shared gate must only inspect the Vercel status context');
assert.match(gate,/rate limited/i,'shared gate must detect Vercel deployment rate-limit wording');
assert.match(gate,/blocked:'true'/,'rate limit must be exposed as a blocked state');
assert.match(gate,/ready:'false'/,'blocked production must not run expensive production checks');
assert.doesNotMatch(gate,/process\.exit\(42\)/,'Vercel cooldown must not turn a healthy code change into a red workflow failure');
assert.match(gate,/process\.exitCode=0/,'rate-limited gate must finish successfully');
assert.match(gate,/process\.exitCode=1/,'a real stale production without rate limit must still fail');

for(const path of workflows){
  const source=read(path);
  assert.match(source,/statuses:\s*read/,path+' must grant read access to commit statuses');
  assert.match(source,/id:\s*production_gate/,path+' must expose the shared production readiness gate');
  assert.match(source,/node \.github\/scripts\/production-readiness-gate\.mjs/,path+' must run the shared production readiness gate');
  assert.match(source,/GITHUB_TOKEN:\s*\$\{\{ github\.token \}\}/,path+' must authenticate the GitHub status lookup');
  assert.match(source,/steps\.production_gate\.outputs\.ready == 'true'/,path+' must gate expensive production work on readiness');
  assert.match(source,/steps\.production_gate\.outputs\.blocked == 'true'/,path+' must surface a non-failing blocked state');
  assert.doesNotMatch(source,/Stop early on Vercel build-rate-limit/,path+' must not use the old red fast-fail step');
}

console.log('production Vercel shared readiness gate regression passed');
