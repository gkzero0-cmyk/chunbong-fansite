import fs from 'node:fs';

function replaceOnce(source,from,to,label){
  const at=source.indexOf(from);
  if(at<0)throw new Error(`missing patch anchor: ${label}`);
  if(source.indexOf(from,at+1)>=0)throw new Error(`ambiguous patch anchor: ${label}`);
  return source.slice(0,at)+to+source.slice(at+from.length);
}

const apiPath='lib/operator-center-api.js';
let api=fs.readFileSync(apiPath,'utf8');

api=replaceOnce(api,
"function hasDedicatedOperatorRedis(){return operatorRedisMode()==='dedicated'}\nfunction redisTemporarilyUnavailable(error){",
"function hasDedicatedOperatorRedis(){return operatorRedisMode()==='dedicated'}\nfunction legacySharedRedisConfigured(){return Boolean((process.env.KV_REST_API_URL&&process.env.KV_REST_API_TOKEN)||(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN))}\nfunction redisTemporarilyUnavailable(error){",
'legacy shared redis flag');

api=replaceOnce(api,
"async function recoveryMode({fresh=false}={}){\n  if(!fresh&&Date.now()-recoveryModeMemory.at<30000)return recoveryModeMemory.value;\n  if(!hasRedis()){recoveryModeMemory={at:Date.now(),value:false};return false}",
"async function recoveryMode({fresh=false}={}){\n  if(!fresh&&Date.now()-recoveryModeMemory.at<30000)return recoveryModeMemory.value;\n  if(!hasDedicatedOperatorRedis()){recoveryModeMemory={at:Date.now(),value:false};return false}",
'recovery mode dedicated store');

api=replaceOnce(api,
"async function persistQuotaDailySummary(now=Date.now()){\n  if(!hasRedis()||now-quotaPersistAt<60*60*1000)return;",
"async function persistQuotaDailySummary(now=Date.now()){\n  if(!hasDedicatedOperatorRedis()||now-quotaPersistAt<60*60*1000)return;",
'quota summary dedicated store');
api=replaceOnce(api,
"async function quotaDailyHistory(days=30){\n  if(!hasRedis())return[];",
"async function quotaDailyHistory(days=30){\n  if(!hasDedicatedOperatorRedis())return[];",
'quota history dedicated store');

api=replaceOnce(api,
"async function authEpoch({fresh=false}={}){\n  if(!hasRedis())return authEpochMemory.value||1;",
"async function authEpoch({fresh=false}={}){\n  if(!hasDedicatedOperatorRedis())return authEpochMemory.value||1;",
'auth epoch dedicated store');
api=replaceOnce(api,
"  if(!hasRedis()||redisCircuitOpenUntil>Date.now())return current;",
"  if(!hasDedicatedOperatorRedis()||redisCircuitOpenUntil>Date.now())return current;",
'session shared redis bypass');

api=replaceOnce(api,
"  if(hasRedis()){\n    try{\n      const meta={id:jti,provider:safeText(provider,24),createdAt:new Date(now).toISOString(),lastSeen:new Date(now).toISOString(),expiresAt:new Date(exp).toISOString()};",
"  if(hasDedicatedOperatorRedis()){\n    try{\n      const meta={id:jti,provider:safeText(provider,24),createdAt:new Date(now).toISOString(),lastSeen:new Date(now).toISOString(),expiresAt:new Date(exp).toISOString()};",
'session metadata dedicated store');
api=replaceOnce(api,
"  if(hasRedis()&&redisCircuitOpenUntil<=now){\n    try{\n      const claimed=await redisCommand('SET','operator:auth:email-cooldown:v1','1','NX','EX',60);",
"  if(hasDedicatedOperatorRedis()&&redisCircuitOpenUntil<=now){\n    try{\n      const claimed=await redisCommand('SET','operator:auth:email-cooldown:v1','1','NX','EX',60);",
'email cooldown dedicated store');
api=replaceOnce(api,
"async function logSecurity(action,provider='system',detail=''){\n  if(!hasRedis())return;",
"async function logSecurity(action,provider='system',detail=''){\n  if(!hasDedicatedOperatorRedis())return;",
'security log dedicated store');

api=replaceOnce(api,
"async function securityLogList(limit=40){\n  if(!hasRedis())return[];",
"async function securityLogList(limit=40){\n  if(!hasDedicatedOperatorRedis())return[];",
'security list dedicated store');
api=replaceOnce(api,
"async function healthHistoryList(limit=20){\n  if(!hasRedis())return[];",
"async function healthHistoryList(limit=20){\n  if(!hasDedicatedOperatorRedis())return[];",
'health list dedicated store');
api=replaceOnce(api,
"async function recordHealthState(summary={}){\n  if(!hasRedis()||redisCircuitOpenUntil>Date.now())return healthStateMemory.history;",
"async function recordHealthState(summary={}){\n  if(!hasDedicatedOperatorRedis()||redisCircuitOpenUntil>Date.now())return healthStateMemory.history;",
'health persistence dedicated store');

api=replaceOnce(api,
"    storage:{redisConfigured,redisOk,liveChecked:deepStorage,limited:circuitLimited||redisOk===false,analyticsRecordedDays:recordedDays,feedbackTotal,...storageStats},\n    redisUsage,",
"    storage:{redisConfigured,redisOk,liveChecked:deepStorage,limited:circuitLimited||redisOk===false,analyticsRecordedDays:recordedDays,feedbackTotal,...storageStats},\n    operatorMigration:{dedicatedConfigured:hasDedicatedOperatorRedis(),legacySharedConfigured:legacySharedRedisConfigured(),status:hasDedicatedOperatorRedis()?'dedicated-active':'awaiting-native-upstash',historicalRestore:'rdb-import-before-cutover',legacyDeletePlanned:false},\n    redisUsage,",
'operator migration status');

api=replaceOnce(api,
"async function handleFeedbackSubmit(req,res){\n  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});\n  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});",
"async function handleFeedbackSubmit(req,res){\n  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});\n  const body=parseBody(req?.body);if(!body)return sendJson(res,400,{error:'invalid_request'});\n  if(!hasDedicatedOperatorRedis())return sendJson(res,503,{error:'feedback_migration_pending',migrationRequired:true});",
'feedback submit migration guard');

api=replaceOnce(api,
"async function handleOperatorAnalytics(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  const days=query(req).get('days')||7,cacheKey=String(days),cached=analyticsOverviewCache.get(cacheKey);",
"async function handleOperatorAnalytics(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!hasDedicatedOperatorRedis())return sendJson(res,503,{error:'analytics_migration_pending',storageDegraded:true,migrationRequired:true});\n  const days=query(req).get('days')||7,cacheKey=String(days),cached=analyticsOverviewCache.get(cacheKey);",
'analytics migration guard');
api=replaceOnce(api,
"async function handleOperatorFeedback(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!hasRedis())return sendJson(res,503,{error:'feedback_unavailable'});",
"async function handleOperatorFeedback(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!hasDedicatedOperatorRedis())return sendJson(res,503,{error:'feedback_migration_pending',migrationRequired:true});",
'feedback read migration guard');
api=replaceOnce(api,
"async function handleOperatorFeedbackUpdate(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});",
"async function handleOperatorFeedbackUpdate(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'POST').toUpperCase()!=='POST')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});\n  if(!hasDedicatedOperatorRedis())return sendJson(res,503,{error:'feedback_migration_pending',migrationRequired:true});",
'feedback update migration guard');

api=replaceOnce(api,
"  if(details&&hasRedis()&&redisCircuitOpenUntil<=Date.now()){",
"  if(details&&hasDedicatedOperatorRedis()&&redisCircuitOpenUntil<=Date.now()){",
'session details dedicated read');
api=replaceOnce(api,
"  }else if(details&&hasRedis())storageDegraded=true;",
"  }else if(details)storageDegraded=true;",
'session details degraded state');

api=replaceOnce(api,
"async function handleOperatorSecurityLog(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!hasRedis())return sendJson(res,503,{error:'security_log_unavailable'});",
"async function handleOperatorSecurityLog(req,res){\n  const current=await requireOwner(req,res);if(!current)return;\n  if(String(req?.method||'GET').toUpperCase()!=='GET')return sendJson(res,405,{error:'method_not_allowed'});\n  if(!hasDedicatedOperatorRedis())return sendJson(res,503,{error:'security_log_migration_pending',storageDegraded:true,migrationRequired:true});",
'security log migration guard');

api=replaceOnce(api,
"  if(current?.jti&&hasRedis()){try{await redisPipeline([['ZREM',SESSION_INDEX,current.jti],['DEL',SESSION_META_PREFIX+current.jti]])}catch(_){}}",
"  if(current?.jti&&hasDedicatedOperatorRedis()){try{await redisPipeline([['ZREM',SESSION_INDEX,current.jti],['DEL',SESSION_META_PREFIX+current.jti]])}catch(_){}}",
'logout session metadata');
api=replaceOnce(api,
"  if(hasRedis()){try{\n    const result=await redisPipeline([['INCR',AUTH_EPOCH_KEY],['DEL',SESSION_INDEX]]);",
"  if(hasDedicatedOperatorRedis()){try{\n    const result=await redisPipeline([['INCR',AUTH_EPOCH_KEY],['DEL',SESSION_INDEX]]);",
'logout all dedicated store');

fs.writeFileSync(apiPath,api);

const uiPath='operator-redis-diagnostics.js';
let ui=fs.readFileSync(uiPath,'utf8');
ui=replaceOnce(ui,
"<div class=\"operator-grid-2 operator-redis-diagnostic-grid\"><section><div class=\"operator-section-title-row\"><strong>명령어별</strong><span>GET · ZRANGE · SMEMBERS 등</span></div>",
"<div class=\"operator-grid-2 operator-redis-diagnostic-grid\"><section class=\"operator-redis-diagnostic-note\"><strong>전용 Operator Redis</strong><p id=\"system-operator-store-state\">연결 대기 · native Upstash DB를 만든 뒤 기존 DB를 RDB Import하고 OPERATOR_REDIS 환경변수를 연결하세요.</p><small>기존 Vercel 관리형 Redis 데이터는 전환 확인 전까지 삭제하지 않습니다.</small></section><section><div class=\"operator-section-title-row\"><strong>명령어별</strong><span>GET · ZRANGE · SMEMBERS 등</span></div>",
'operator store status panel');
ui=replaceOnce(ui,
"function renderRedisDiagnostics(data={},meta={}){\n  const root=panel();if(!root)return;",
"function renderOperatorStoreState(data={}){\n  const node=$('#system-operator-store-state');if(!node)return;\n  const connected=Boolean(data?.resourceBudget?.isolatedStores?.operator);\n  node.textContent=connected?'연결됨 · 신규 운영자 데이터는 전용 native Upstash Redis에 저장됩니다.':'연결 대기 · 기존 DB를 새 native Upstash DB에 RDB Import한 뒤 OPERATOR_REDIS 환경변수를 연결하세요.';\n  node.dataset.connected=connected?'1':'0';\n}\nfunction renderRedisDiagnostics(data={},meta={}){\n  const root=panel();if(!root)return;",
'render operator store state');
ui=replaceOnce(ui,
"    const data=await response.json(),snapshot=data.redisCommandDiagnostics;\n    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}",
"    const data=await response.json(),snapshot=data.redisCommandDiagnostics;\n    renderOperatorStoreState(data);\n    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}",
'load operator store state');
fs.writeFileSync(uiPath,ui);

console.log('operator Redis isolation patch applied');
