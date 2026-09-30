import fs from 'node:fs';

function patch(path,from,to){
  let source=fs.readFileSync(path,'utf8');
  if(source.includes(to))return false;
  if(!source.includes(from))throw new Error(`Expected source fragment not found in ${path}`);
  source=source.replace(from,to);
  fs.writeFileSync(path,source);
  return true;
}

let changed=false;

changed=patch('api/content.js',
"const operatorCenter=require('../lib/operator-center-api');\nconst contentArchive=require('../lib/chunbong-content-archive-api');",
"const operatorCenter=require('../lib/operator-center-api');\nconst operatorObservability=require('../lib/operator-observability');\nconst contentArchive=require('../lib/chunbong-content-archive-api');")||changed;

changed=patch('api/content.js',
"  const type=requestUrl.searchParams.get('type')||'';\n  if(type==='chuntris-ranking') return handleChuntrisRanking(req,res);",
"  const type=requestUrl.searchParams.get('type')||'';\n  if(type==='client-health') return operatorObservability.handleClientHealth(req,res);\n  const observedCollectorTypes=new Set(['vod','notice','clips','fanart','youtube','schedule','activity','live']);\n  if(observedCollectorTypes.has(type)&&typeof res?.json==='function'){\n    const originalJson=res.json.bind(res);\n    res.json=payload=>{try{operatorObservability.recordCollectorResult(type,payload)}catch{}return originalJson(payload)};\n  }\n  if(type==='chuntris-ranking') return handleChuntrisRanking(req,res);")||changed;

changed=patch('lib/operator-center-api.js',
"const realtimeUpstashUsage=require('./realtime-upstash-usage');\nconst {realtimeRedisMode}=require('./realtime-redis-env');",
"const realtimeUpstashUsage=require('./realtime-upstash-usage');\nconst operatorObservability=require('./operator-observability');\nconst {realtimeRedisMode}=require('./realtime-redis-env');")||changed;

changed=patch('lib/operator-center-api.js',
"  const recoveryAvailable=recoverySnapshotAvailable(),healthHistory=recordHealthStateMemory({level:healthLevel,issues:healthIssues});\n  const result={",
"  const recoveryAvailable=recoverySnapshotAvailable(),healthHistory=recordHealthStateMemory({level:healthLevel,issues:healthIssues});\n  const observabilitySnapshot=operatorObservability.snapshot();\n  const result={")||changed;

changed=patch('lib/operator-center-api.js',
"    redisUsage,\n    realtimeRedisUsage,\n    services:",
"    redisUsage,\n    realtimeRedisUsage,\n    clientHealth:observabilitySnapshot.clientHealth,\n    collectorHealth:observabilitySnapshot.collectorHealth,\n    services:")||changed;

const oldUsageSection='<section class="operator-redis-diagnostic-note"><strong>공식 월간 사용량</strong><p>현재 DB는 Vercel 관리형 Upstash라 Developer API 자동 실측이 지원되지 않습니다. 월간 commands와 잔여량은 <a href="https://console.upstash.com/redis" target="_blank" rel="noopener">Upstash Usage ↗</a>가 공식 기준입니다.</p><small>이 패널은 현재 warm API 인스턴스에서 관찰한 표본이며 월간 전체 사용량이 아닙니다.</small></section>';
const newUsageSection='<section class="operator-redis-diagnostic-note"><strong>월간 Redis 사용량</strong><p id="system-redis-monthly-usage">실측 또는 관찰 기반 추정을 계산하는 중입니다.</p><small id="system-redis-monthly-thresholds">70% 주의 · 85% 경고 · 95% 위험</small></section><section><div class="operator-section-title-row"><strong>수집기 신선도</strong><span>warm-instance 표본 · Redis 0회</span></div><div id="system-collector-health"></div></section><section><div class="operator-section-title-row"><strong>실사용자 오류</strong><span>2% 익명 표본 · warm-instance 메모리</span></div><div id="system-client-health"></div></section>';
changed=patch('operator-redis-diagnostics.js',oldUsageSection,newUsageSection)||changed;

const renderMarker='function renderRedisDiagnostics(data={},meta={}){';
const renderHelpers=`function elapsedLabel(value=''){\n  const time=Date.parse(String(value||''));if(!Number.isFinite(time))return'-';\n  const minutes=Math.max(0,Math.round((Date.now()-time)/60000));\n  if(minutes<1)return'방금';if(minutes<60)return minutes+'분 전';if(minutes<1440)return Math.round(minutes/60)+'시간 전';return Math.round(minutes/1440)+'일 전';\n}\nfunction observedMonthlyUsage(snapshot={}){\n  const commands=Number(snapshot.observedCommands)||0,started=Date.parse(String(snapshot.startedAt||''));\n  if(!commands||!Number.isFinite(started))return null;\n  const elapsedHours=Math.max((Date.now()-started)/3600000,5/60);\n  return Math.max(commands,Math.round(commands/elapsedHours*24*30));\n}\nfunction redisUsageLevel(pct){const value=Number(pct)||0;return value>=95?'bad':value>=85?'warn':value>=70?'watch':'ok'}\nfunction renderMonthlyUsage(data={},snapshot={}){\n  const node=$('#system-redis-monthly-usage');if(!node)return;\n  const candidates=[data?.realtimeRedisUsage,data?.redisUsage];\n  const exact=candidates.find(row=>row?.exact===true&&Number.isFinite(Number(row.used)));\n  const limit=Math.max(1,Number(exact?.monthlyLimit)||Number(candidates.find(row=>Number(row?.monthlyLimit)>0)?.monthlyLimit)||500000);\n  const estimated=observedMonthlyUsage(snapshot),used=exact?Number(exact.used):estimated;\n  if(!Number.isFinite(used)){node.textContent='정확 실측 연결 대기 · warm-instance 표본이 쌓이면 관찰 기반 추정을 표시합니다.';node.dataset.level='ok';return}\n  const pct=Math.max(0,used/limit*100),remaining=Math.max(0,limit-used),level=redisUsageLevel(pct);\n  node.dataset.level=level;\n  node.textContent=(exact?'정확 실측':'관찰 기반 추정')+' · '+fmt(used)+' / '+fmt(limit)+' commands · '+pct.toFixed(1)+'% · 잔여 '+fmt(remaining);\n}\nfunction renderCollectorHealth(data={}){\n  const root=$('#system-collector-health');if(!root)return;const rows=Array.isArray(data?.collectorHealth?.items)?data.collectorHealth.items:[];\n  if(!rows.length){root.innerHTML='<p class="operator-empty">이 warm 인스턴스에서 아직 수집 요청 표본이 없습니다.</p>';return}\n  root.innerHTML=rows.map(row=>{const failures=Number(row.consecutiveFailures)||0,state=failures?'연속 실패 '+fmt(failures)+'회':row.fallback?'fallback':'정상';return '<div class="operator-redis-diagnostic-row"><span><b>'+esc(row.type)+'</b><small>'+esc(state)+' · 확인 '+esc(elapsedLabel(row.lastCheckedAt))+' · 최신 데이터 '+esc(elapsedLabel(row.lastDataAt))+'</small></span></div>'}).join('');\n}\nfunction renderClientHealth(data={}){\n  const root=$('#system-client-health');if(!root)return;const health=data?.clientHealth||{},rows=Array.isArray(health.samples)?health.samples:[];\n  if(!rows.length){root.innerHTML='<p class="operator-empty">2% 표본에서 아직 오류·지연이 관찰되지 않았습니다.</p>';return}\n  const summary='<p class="operator-empty">표본 '+fmt(health.count||0)+'건 · 오류 '+fmt(health.errors||0)+'건 · 지연 '+fmt(health.slow||0)+'건 · Redis 저장 0회</p>';\n  root.innerHTML=summary+rows.slice(0,8).map(row=>'<div class="operator-redis-diagnostic-row"><span><b>'+esc(row.page||'/')+'</b><small>'+esc(row.kind)+' · '+esc(row.message||'')+(row.durationMs?' · '+fmt(row.durationMs)+'ms':'')+' · '+esc(elapsedLabel(row.at))+'</small></span></div>').join('');\n}\nfunction renderSystemObservability(data={},snapshot={}){renderMonthlyUsage(data,snapshot);renderCollectorHealth(data);renderClientHealth(data)}\n`;
changed=patch('operator-redis-diagnostics.js',renderMarker,renderHelpers+renderMarker)||changed;

changed=patch('operator-redis-diagnostics.js',
"    renderOperatorStoreState(data);\n    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}",
"    renderOperatorStoreState(data);\n    renderSystemObservability(data,snapshot||{});\n    if(snapshot){writeSnapshot(snapshot);renderRedisDiagnostics(snapshot,{cached:false})}")||changed;

if(changed)console.log('observability round3 source patches applied');
else console.log('observability round3 source patches already applied');
