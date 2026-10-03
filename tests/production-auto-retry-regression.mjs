import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const retry=read('.github/workflows/production-git-auto-retry.yml');
const prebuilt=read('.github/workflows/production-prebuilt-recovery.yml');
const sync=read('.github/workflows/production-version-sync.yml');
const sw=read('service-worker.js');
const shell=read('site-shell.js');
const shellIdle=read('site-shell-idle.js');

assert.match(retry,/cron:\s*'17 \* \* \* \*'/,'production retry window must be checked hourly');
assert.match(retry,/contents:\s*write/,'Git retry needs permission to create retry commit');
assert.match(retry,/statuses:\s*read/,'Git retry must be able to inspect Vercel commit statuses');
assert.match(retry,/git commit --allow-empty/,'Git retry must retrigger Git integration without changing site files');
assert.match(retry,/api\/version/,'Git retry must compare production version before committing');
assert.match(retry,/runtimeSynced===true\|\|p\.synced===true/,'Git retry must honor runtime sync when only internal files differ');
assert.doesNotMatch(retry,/VERCEL_TOKEN/,'Git-based retry must not require a Vercel token');
assert.match(retry,/AGE_SECONDS.*72000/s,'scheduled retry must wait at least 20 hours after the latest main commit when no rate-limit status is known');
assert.match(retry,/RATE_LIMIT_AGE_SECONDS.*86400/s,'scheduled retry must wait the documented 24 hours after the persisted Vercel rate-limit anchor');
assert.match(retry,/rate limited/i,'Git retry must inspect the current Vercel rate-limit status text');
assert.match(retry,/actions\/cache\/restore@v4/,'Git retry must restore the previous cooldown anchor without rescanning commit history');
assert.match(retry,/actions\/cache\/save@v4/,'Git retry must persist cooldown state after every guardian run');
assert.match(retry,/CACHED_RATE_LIMIT_AT/,'Git retry must preserve the first observed rate-limit anchor across later main commits');
assert.match(retry,/CURRENT_RATE_LIMIT_AT/,'Git retry must inspect the current main commit for a fresh Vercel rate-limit signal');
assert.match(retry,/\.guardian\/production-state\.json/,'Git retry must persist only a small guardian state file');
assert.doesNotMatch(retry,/commits\?sha=main&per_page=/,'Git retry must not scan main commit history every hour');
assert.match(retry,/GITHUB_EVENT_NAME.*workflow_dispatch/s,'manual retry must bypass the age and cooldown guards');

assert.match(prebuilt,/workflow_dispatch:/,'prebuilt recovery must remain manually runnable');
assert.match(prebuilt,/push:\s*\n\s*branches: \[main\][\s\S]*production-prebuilt\.trigger/,'prebuilt recovery may run only for the explicit recovery marker on main');
assert.match(prebuilt,/can_deploy=false/,'prebuilt recovery must expose a clean unavailable state');
assert.match(prebuilt,/steps\.availability\.outputs\.can_deploy == 'true'/,'prebuilt deployment steps must be guarded by recovery availability');
assert.match(prebuilt,/::warning::VERCEL_TOKEN repository secret is not configured/,'missing Vercel token should produce a visible warning instead of a failed recovery run');
assert.match(prebuilt,/vercel_deployment_quota_cooldown/,'prebuilt recovery must detect the deployment quota cooldown');
assert.match(prebuilt,/RATE_LIMIT_CREATED_AT/,'prebuilt recovery must anchor its cooldown to observed Vercel rate-limit status');
assert.match(prebuilt,/AGE_SECONDS.*86400/s,'prebuilt recovery must wait 24 hours after a deployment quota limit before uploading again');

assert.match(sync,/production-readiness-gate\.mjs/,'production sync should share the readiness gate');
assert.match(sync,/steps\.production_gate\.outputs\.blocked == 'true'/,'rate-limited production sync should finish as a visible blocked state instead of a code failure');
assert.match(sw,/runtime-v36/,'PWA cache version must follow the current optimized app-shell generation');
assert.match(shell,/site-shell-idle\.js/,'core PWA shell must still attach the deferred shared runtime');
assert.match(shellIdle,/site-improvements\.js/,'deferred shared runtime must still load site improvements after startup');
assert.doesNotMatch(sw,/['"]\/site-improvements\.js['"]/,'shared improvement runtime must stay out of the initial PWA app-shell precache');
assert.doesNotMatch(sw,/['"]\/site-improvements\.css['"]/,'shared improvement styles must stay out of the initial PWA app-shell precache');

console.log('production auto retry + recovery guard + slim PWA cache regression passed');
