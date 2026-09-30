import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');

for(const name of ['REALTIME_UPSTASH_EMAIL','REALTIME_UPSTASH_API_KEY','REALTIME_UPSTASH_DATABASE_ID']){
  assert.ok(api.includes(name),`operator API should support ${name}`);
}
assert.match(api,/async function realtimeUpstashUsageStatus\(\)/,'operator API should expose realtime Upstash usage status');
assert.ok(api.includes('realtimeRedisUsage'),'system status should return realtimeRedisUsage separately');
assert.ok(api.includes("https://api.upstash.com/v2/redis/stats/"),'usage telemetry must use Upstash Developer API, not Redis commands');

for(const id of ['system-realtime-redis-monthly-used','system-realtime-redis-monthly-remaining','system-realtime-redis-monthly-pct','system-realtime-redis-daily-commands','system-realtime-redis-monthly-read','system-realtime-redis-monthly-write','system-realtime-redis-current-storage','system-realtime-redis-usage-source']){
  assert.ok(html.includes(`id=\"${id}\"`),`operator UI should include ${id}`);
  assert.ok(ui.includes(`#${id}`),`operator UI script should render ${id}`);
}
assert.ok(ui.includes('data.realtimeRedisUsage||{}'),'operator UI should render realtime usage separately');
assert.ok(ui.includes('실측 연결 대기'),'missing realtime Developer API credentials should not fabricate usage numbers');

console.log('realtime Redis usage regression passed');
