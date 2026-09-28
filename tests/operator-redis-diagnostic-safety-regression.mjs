import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
assert.match(source,/\[operator-redis\] request failed/);
assert.match(source,/status:response\.status/);
assert.match(source,/command:String\(command\|\|''\)\.toUpperCase\(\)/);
const start=source.indexOf("console.error('[operator-redis] request failed");
const end=source.indexOf("throw new Error(reason==='service_limit'?'redis_service_limit':'redis_'+response.status);",start);
assert.ok(start>=0&&end>start,'Redis diagnostic block should be found before the normalized error throw');
const block=source.slice(start,end);
for(const forbidden of ['env.token','env.url','base','args','path','SESSION_SECRET_KEY','AUTH_EPOCH_KEY']) assert.equal(block.includes(forbidden),false);
console.log('operator Redis diagnostic safety regression passed');
