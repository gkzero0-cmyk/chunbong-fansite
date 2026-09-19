import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const helper=read('.github/scripts/vercel-rate-limit-fast-fail.mjs');
const workflows=[
  '.github/workflows/activity-center-production-smoke.yml',
  '.github/workflows/chungwagame-production-smoke.yml',
  '.github/workflows/chuncortile-production-smoke.yml',
  '.github/workflows/pwa-production-smoke.yml',
  '.github/workflows/production-version-sync.yml'
];

assert.match(helper,/status\.context==='Vercel'/,'helper must only inspect the Vercel status context');
assert.match(helper,/status\.state==='failure'/,'helper must require a failed Vercel status');
assert.match(helper,/build-rate-limit/,'helper must detect Vercel build-rate-limit');
assert.match(helper,/process\.exit\(42\)/,'rate limit must stop production checks immediately');
assert.match(helper,/statuses\?per_page=100/,'helper must read commit statuses from GitHub');

for(const path of workflows){
  const source=read(path);
  assert.match(source,/statuses:\s*read/,path+' must grant read access to commit statuses');
  assert.match(source,/Stop early on Vercel build-rate-limit/,path+' must include the Vercel rate-limit preflight');
  assert.match(source,/node \.github\/scripts\/vercel-rate-limit-fast-fail\.mjs/,path+' must run the shared helper');
  assert.match(source,/GITHUB_TOKEN:\s*\$\{\{ github\.token \}\}/,path+' must authenticate the GitHub status lookup');
}

console.log('production Vercel rate-limit fast-fail regression passed');
