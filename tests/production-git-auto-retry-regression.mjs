import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/production-git-auto-retry.yml', import.meta.url), 'utf8');

assert.match(workflow, /cron:\s*'17 \* \* \* \*'/, 'hourly retry schedule must remain active');
assert.match(workflow, /status\.context === 'Vercel'/, 'retry logic must inspect Vercel commit statuses');
assert.match(workflow, /rate limited/i, 'retry logic must detect Vercel rate-limit statuses');
assert.match(workflow, /RATE_LIMIT_AGE_SECONDS\" -ge 86400/, 'Vercel retries should open after the documented 24-hour cooldown');
assert.ok(!workflow.includes('RATE_LIMIT_AGE_SECONDS" -ge 90000'), 'retry must not add an unnecessary extra hour beyond the documented cooldown');
assert.match(workflow, /AGE_SECONDS\" -ge 72000/, 'fallback no-status guard should remain intact');
assert.match(workflow, /git commit --allow-empty -m 'chore: retry Vercel production deployment'/, 'retry must retrigger the Git integration with a single empty commit');

console.log('production Git auto-retry regression passed');
