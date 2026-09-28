import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/push-notifications-api.js',import.meta.url),'utf8');

assert.match(source,/const SUB_HASH='push:subscriptions:v2'/);
assert.match(source,/redisCommand\('HSET',SUB_HASH,id,JSON\.stringify\(row\)\)/,'new subscriptions should use one hash write');
assert.match(source,/redisCommand\('HGETALL',SUB_HASH\)/,'dispatch should load v2 subscriptions in one Redis read');
assert.match(source,/redisCommand\('HDEL',SUB_HASH,id\)/,'unsubscribe should remove the v2 hash field');
assert.match(source,/redisCommand\('SMEMBERS',SUB_SET\)/,'legacy fallback must remain for migration');
assert.match(source,/redisCommand\('MGET'/,'legacy subscriptions should still migrate in batches');
assert.match(source,/redisCommand\('HSET',SUB_HASH,\.\.\.args\)/,'legacy rows should migrate into the v2 hash');
assert.match(source,/let vapidCache=null;/);
assert.match(source,/let webPushSender=null;/);

const start=source.indexOf('async function subscriptions()');
const end=source.indexOf('async function sender()',start);
assert.ok(start>=0&&end>start);
const block=source.slice(start,end);
assert.ok(block.indexOf("redisCommand('HGETALL',SUB_HASH)")<block.indexOf("redisCommand('SMEMBERS',SUB_SET)"),'v2 hash must be attempted before legacy reads');

console.log('push Redis budget regression passed');
