import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/push-notifications-api.js',import.meta.url),'utf8');
assert.match(source,/let vapidCache=null;/);
assert.match(source,/let webPushSender=null;/);
assert.match(source,/redisCommand\('MGET'/,'push subscriptions should batch Redis reads');
assert.match(source,/offset<limited\.length;offset\+=100/,'push MGET batches should cap URL size');
const start=source.indexOf('async function subscriptions()');
const end=source.indexOf('async function sender()',start);
assert.ok(start>=0&&end>start);
const block=source.slice(start,end);
assert.doesNotMatch(block,/redisCommand\('GET',SUB_PREFIX\+id\)/,'subscription loading must not use one GET per subscriber');
const resolveStart=source.indexOf('async function resolveVapid()');
const resolveEnd=source.indexOf('async function redisCommand',resolveStart);
const resolveBlock=source.slice(resolveStart,resolveEnd);
assert.match(resolveBlock,/if\(vapidCache\?\.publicKey&&vapidCache\?\.privateKey\)return vapidCache/);
console.log('push Redis budget regression passed');
