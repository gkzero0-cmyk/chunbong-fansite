import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/push-dispatch.yml',import.meta.url),'utf8');

assert.match(workflow,/cron:\s*'\*\/5 \* \* \* \*'/,'background dispatch cadence must remain enabled');
assert.match(workflow,/workflow_dispatch:/,'background dispatch must remain manually runnable');
assert.doesNotMatch(workflow,/^  push:/m,'GitHub OIDC policy does not authorize push-event tokens for this workflow');
assert.match(workflow,/AUDIENCE:\s*chunbong-fansite-push/,'GitHub OIDC audience must remain stable');
assert.match(workflow,/Authorization: Bearer \$token/,'archive sync must send the GitHub OIDC token');
assert.match(workflow,/Origin: https:\/\/github\.com/,'archive sync must carry an explicit external Origin so it cannot be mistaken for a same-site browser request');
assert.match(workflow,/content-archive-auto-sync/,'archive sync endpoint must remain wired');

console.log('push dispatch OIDC regression passed');
