import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const root=process.cwd();
const helperPath=path.join(root,'lib','realtime-redis-env.js');
assert.equal(fs.existsSync(helperPath),true,'shared realtime Redis env helper must exist');
const {resolveRealtimeRedisEnv,realtimeRedisMode}=require(helperPath);

const legacy={KV_REST_API_URL:'https://legacy.example',KV_REST_API_TOKEN:'legacy-token'};
assert.deepEqual(resolveRealtimeRedisEnv('push',legacy),{url:'https://legacy.example',token:'legacy-token'});
assert.equal(realtimeRedisMode('push',legacy),'shared-kv');

const common={...legacy,REALTIME_REDIS_REST_URL:'https://realtime.example',REALTIME_REDIS_REST_TOKEN:'realtime-token'};
assert.deepEqual(resolveRealtimeRedisEnv('push',common),{url:'https://realtime.example',token:'realtime-token'});
assert.deepEqual(resolveRealtimeRedisEnv('ranking',common),{url:'https://realtime.example',token:'realtime-token'});
assert.deepEqual(resolveRealtimeRedisEnv('multiplayer',common),{url:'https://realtime.example',token:'realtime-token'});
assert.equal(realtimeRedisMode('ranking',common),'realtime-dedicated');

const specific={...common,RANKING_REDIS_REST_URL:'https://ranking.example',RANKING_REDIS_REST_TOKEN:'ranking-token'};
assert.deepEqual(resolveRealtimeRedisEnv('ranking',specific),{url:'https://ranking.example',token:'ranking-token'});
assert.equal(realtimeRedisMode('ranking',specific),'feature-dedicated');

for(const file of [
  'lib/push-notifications-api.js',
  'lib/minigame-multiplayer-api.js',
  'lib/chuntris-ranking-api.js',
  'lib/chunbak-ranking-api.js',
  'lib/chungwagame-ranking-api.js',
  'lib/chuncortile-ranking-api.js'
]){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  assert.match(source,/realtime-redis-env/,'must use shared realtime Redis resolver: '+file);
}

console.log('realtime Redis isolation regression: ok');
