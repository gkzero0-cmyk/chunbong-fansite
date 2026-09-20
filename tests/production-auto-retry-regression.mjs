import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const retry=read('.github/workflows/production-git-auto-retry.yml');
const prebuilt=read('.github/workflows/production-prebuilt-recovery.yml');
const sync=read('.github/workflows/production-version-sync.yml');
const sw=read('service-worker.js');

assert.match(retry,/cron:\s*'20 20 \* \* \*'/,'daily retry must run once per day at 05:20 KST');
assert.match(retry,/contents:\s*write/,'daily retry needs permission to create retry commit');
assert.match(retry,/statuses:\s*read/,'daily retry must be able to inspect Vercel commit statuses');
assert.match(retry,/git commit --allow-empty/,'daily retry must retrigger Git integration without changing site files');
assert.match(retry,/api\/version/,'daily retry must compare production version before committing');
assert.doesNotMatch(retry,/VERCEL_TOKEN/,'Git-based retry must not require a Vercel token');
assert.match(retry,/AGE_SECONDS.*72000/s,'scheduled retry must wait at least 20 hours after the latest main commit');
assert.match(retry,/RATE_LIMIT_AGE_SECONDS.*90000/s,'scheduled retry must wait 25 hours after the latest Vercel rate-limit status');
assert.match(retry,/rate limited/i,'daily retry must inspect recent Vercel rate-limit status text');
assert.match(retry,/commits\?sha=main&per_page=100/,'daily retry must scan enough recent main commits to survive high commit volume');
assert.match(retry,/scanWindowMs = \(90000 \+ 7200\) \* 1000/,'daily retry must stop scanning after the cooldown window plus deployment-delay margin');
assert.match(retry,/GITHUB_EVENT_NAME.*workflow_dispatch/s,'manual retry must bypass the age and cooldown guards');

assert.match(prebuilt,/on:\s*\n\s*workflow_dispatch:/,'prebuilt recovery must be manual-only while a repository token is required');
assert.doesNotMatch(prebuilt,/\n\s*push:\s*\n/,'prebuilt recovery must not auto-run on pushes without a configured Vercel token');
assert.match(prebuilt,/can_deploy=false/,'prebuilt recovery must expose a clean unavailable state when the token is absent');
assert.match(prebuilt,/steps\.token\.outputs\.can_deploy == 'true'/,'prebuilt deployment steps must be guarded by token availability');
assert.match(prebuilt,/::warning::VERCEL_TOKEN repository secret is not configured/,'missing Vercel token should produce a visible warning instead of a failed recovery run');

assert.match(sync,/GITHUB_EVENT_NAME.*schedule/s,'scheduled sync checks should be non-failing warnings while pending');
assert.match(sw,/chunbong-pwa-20260921-v22/,'PWA cache version must advance');
assert.match(sw,/site-improvements\.js/,'PWA shell must cache shared improvement runtime');
assert.match(sw,/site-improvements\.css/,'PWA shell must cache shared improvement styles');

console.log('production auto retry + recovery guard + PWA cache regression passed');