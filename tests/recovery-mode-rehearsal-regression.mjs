import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const operator=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');

assert.match(operator,/RECOVERY_MODE_KEY='operator:recovery-mode:v1'/);
assert.match(operator,/if\(body\.active&&!recoverySnapshotAvailable\(\)\)return sendJson\(res,409/);
assert.match(operator,/if\(body\.active\)await redisCommand\('SET',RECOVERY_MODE_KEY,'1'\)/);
assert.match(operator,/else await redisCommand\('DEL',RECOVERY_MODE_KEY\)/);
assert.match(operator,/recovery_mode_enabled/);
assert.match(operator,/recovery_mode_disabled/);
assert.doesNotMatch(operator,/writeFileSync|renameSync|copyFileSync/,'recovery toggle must not modify snapshot files');
assert.match(api,/const recovery=await operatorCenter\._internals\.recoveryMode\(\)/);
assert.match(api,/backup\?\.\['data\/youtube-engagement-cache\.json'\]/);
assert.match(api,/backup\?\.\['data\/soop-follower-history\.json'\]/);
assert.match(api,/if\(recovery\)payload\.recoveryMode='last-known-good'/);

console.log('safe recovery rehearsal contract passed');
