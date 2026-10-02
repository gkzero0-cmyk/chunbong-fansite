import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/production-git-auto-retry.yml', import.meta.url), 'utf8');

assert.match(workflow, /cron:\s*'17 \* \* \* \*'/, 'hourly retry schedule must remain active');
assert.match(workflow, /commits\/\$\{EXPECTED\}\/status/, 'retry logic must inspect the current main Vercel commit status');
assert.match(workflow, /x\.context==='Vercel'/, 'retry logic must select the Vercel status entry');
assert.match(workflow, /rate limited/i, 'retry logic must detect Vercel rate-limit statuses');
assert.match(workflow, /CACHED_RATE_LIMIT_AT/, 'retry logic must preserve the first observed rate-limit timestamp across later commits');
assert.match(workflow, /actions\/cache\/restore@v4/, 'retry logic must restore the persisted cooldown anchor');
assert.match(workflow, /actions\/cache\/save@v4/, 'retry logic must save the persisted cooldown anchor');
assert.match(workflow, /RATE_LIMIT_AGE_SECONDS\" -ge 86400/, 'Vercel retries should open after the documented 24-hour cooldown');
assert.ok(!workflow.includes('RATE_LIMIT_AGE_SECONDS" -ge 90000'), 'retry must not add an unnecessary extra hour beyond the documented cooldown');
assert.match(workflow, /AGE_SECONDS\" -ge 72000/, 'fallback no-status guard should remain intact');
assert.match(workflow, /git commit --allow-empty -m 'chore: retry Vercel production deployment'/, 'retry must retrigger the Git integration with a single empty commit');
assert.match(workflow, /runtimeSynced===true\|\|p\.synced===true/, 'retry must skip internal-only SHA gaps that are already runtime synced');
assert.match(workflow, /Production runtime is already synced/, 'runtime-synced retries should explain why no deployment was created');

console.log('production Git auto-retry regression passed');
