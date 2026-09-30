'use strict';

const FEATURE_PREFIX=Object.freeze({
  push:'PUSH',
  ranking:'RANKING',
  multiplayer:'MULTIPLAYER'
});

function pair(env,urlKey,tokenKey){
  const url=String(env?.[urlKey]||'');
  const token=String(env?.[tokenKey]||'');
  return url&&token?{url,token}:null;
}

function resolveRealtimeRedisEnv(feature,env=process.env){
  const prefix=FEATURE_PREFIX[String(feature||'')];
  if(prefix){
    const specific=pair(env,`${prefix}_REDIS_REST_URL`,`${prefix}_REDIS_REST_TOKEN`);
    if(specific)return specific;
  }
  const realtime=pair(env,'REALTIME_REDIS_REST_URL','REALTIME_REDIS_REST_TOKEN');
  if(realtime)return realtime;
  const kv=pair(env,'KV_REST_API_URL','KV_REST_API_TOKEN');
  if(kv)return kv;
  const upstash=pair(env,'UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN');
  if(upstash)return upstash;
  return{url:'',token:''};
}

function realtimeRedisMode(feature,env=process.env){
  const prefix=FEATURE_PREFIX[String(feature||'')];
  if(prefix&&pair(env,`${prefix}_REDIS_REST_URL`,`${prefix}_REDIS_REST_TOKEN`))return'feature-dedicated';
  if(pair(env,'REALTIME_REDIS_REST_URL','REALTIME_REDIS_REST_TOKEN'))return'realtime-dedicated';
  if(pair(env,'KV_REST_API_URL','KV_REST_API_TOKEN'))return'shared-kv';
  if(pair(env,'UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN'))return'shared-upstash';
  return'none';
}

module.exports={resolveRealtimeRedisEnv,realtimeRedisMode};
