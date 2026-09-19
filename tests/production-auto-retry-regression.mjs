import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const retry=read('.github/workflows/production-git-auto-retry.yml');
const sync=read('.github/workflows/production-version-sync.yml');
const sw=read('service-worker.js');

assert.match(retry,/cron:\s*'10 17 \* \* \*'/,'daily retry must run once per day');
assert.match(retry,/contents:\s*write/,'daily retry needs permission to create retry commit');
assert.match(retry,/git commit --allow-empty/,'daily retry must retrigger Git integration without changing site files');
assert.match(retry,/api\/version/,'daily retry must compare production version before committing');
assert.doesNotMatch(retry,/VERCEL_TOKEN/,'Git-based retry must not require a Vercel token');
assert.match(retry,/AGE_SECONDS.*72000/s,'scheduled retry must wait at least 20 hours after the latest main commit');
assert.match(retry,/GITHUB_EVENT_NAME.*workflow_dispatch/s,'manual retry must bypass the age guard');
assert.match(sync,/GITHUB_EVENT_NAME.*schedule/s,'scheduled sync checks should be non-failing warnings while pending');
assert.match(sw,/chunbong-pwa-20260920-v8/,'PWA cache version must advance');
assert.match(sw,/site-improvements\.js/,'PWA shell must cache shared improvement runtime');
assert.match(sw,/site-improvements\.css/,'PWA shell must cache shared improvement styles');

console.log('production auto retry + PWA cache regression passed');
