import fs from 'node:fs';

// Round 2 hardening applies only scoped, test-covered source edits.
const read=path=>fs.readFileSync(path,'utf8');
const write=(path,value)=>fs.writeFileSync(path,value);
const replaceOnce=(path,before,after,label)=>{
  const source=read(path);
  if(!source.includes(before))throw new Error(`${label}: expected source not found in ${path}`);
  const next=source.replace(before,after);
  if(next===source)throw new Error(`${label}: no change in ${path}`);
  write(path,next);
};
const replaceRegex=(path,pattern,replacer,label)=>{
  const source=read(path);
  if(!pattern.test(source))throw new Error(`${label}: expected pattern not found in ${path}`);
  pattern.lastIndex=0;
  const next=source.replace(pattern,replacer);
  if(next===source)throw new Error(`${label}: no change in ${path}`);
  write(path,next);
};

// 1-2. Redis degraded mode: diagnostics remain readable and dynamic write controls inherit locks.
replaceOnce(
  'operator-redis-diagnostics.js',
  "const selectors=['#feedback-status','#feedback-priority','#feedback-memo-save','#operator-recovery-toggle','#operator-logout-all','#operator-redis-refresh','[data-session-revoke]'];",
  "const selectors=['#feedback-status','#feedback-priority','#feedback-memo-save','#operator-recovery-toggle','#operator-logout-all','[data-session-revoke]'];",
  'keep Redis diagnostic GET available'
);
replaceOnce(
  'operator-redis-diagnostics.js',
  "if(type==='operator-system-status'&&response.ok){setRedisDegradedMode(...(()=>{const state=budgetState(data);return[state.active,state]})());return}",
  "if(type==='operator-system-status'&&response.ok){const state=budgetState(data);setRedisDegradedMode(state.active,state);return}",
  'simplify budget state application'
);
replaceOnce(
  'operator-redis-diagnostics.js',
  "function setRedisDegradedMode(active,{reason='',retryAt=''}={}){",
  "function observeWriteLocks(){\n  if(globalThis.__chunbongOperatorRedisWriteLockObserverV1||typeof MutationObserver!=='function')return;\n  globalThis.__chunbongOperatorRedisWriteLockObserverV1=true;\n  const observer=new MutationObserver(records=>{\n    if(!redisDegradedState.active||!records.some(record=>record.addedNodes?.length))return;\n    queueMicrotask(()=>applyWriteLocks(redisDegradedState.active));\n  });\n  observer.observe(document.body,{childList:true,subtree:true});\n}\nfunction setRedisDegradedMode(active,{reason='',retryAt=''}={}){",
  'observe dynamically rendered write controls'
);
replaceOnce(
  'operator-redis-diagnostics.js',
  "function bind(){\n  panel();ensureDegradedBanner();applyWriteLocks(redisDegradedState.active);",
  "function bind(){\n  panel();ensureDegradedBanner();observeWriteLocks();applyWriteLocks(redisDegradedState.active);",
  'start degraded write lock observer'
);

// 1. Redis workload isolation: expose actual resolver mode per feature in system status.
replaceOnce(
  'lib/operator-center-api.js',
  "const realtimeUpstashUsage=require('./realtime-upstash-usage');",
  "const realtimeUpstashUsage=require('./realtime-upstash-usage');\nconst {realtimeRedisMode}=require('./realtime-redis-env');",
  'import Redis workload mode resolver'
);
replaceRegex(
  'lib/operator-center-api.js',
  /(isolatedStores:\{\s*operator:[^\n]+\n\s*ranking:[^\n]+\n\s*content:[^\n]+\n\s*multiplayer:[^\n]+\n\s*push:[^\n]+\n\s*\})/m,
  `$1,\n      redisModes:{\n        operator:operatorRedisMode(),\n        ranking:realtimeRedisMode('ranking'),\n        multiplayer:realtimeRedisMode('multiplayer'),\n        push:realtimeRedisMode('push')\n      }`,
  'expose Redis workload modes'
);
replaceOnce(
  'operator.js',
  "const isolated=budget.isolatedStores||{},isolatedCount=Object.values(isolated).filter(Boolean).length;\n  if($('#system-budget-isolation'))$('#system-budget-isolation').innerHTML=`<strong>Redis 기능 격리</strong><span>${isolatedCount?fmt(isolatedCount)+'개 기능이 별도 저장소 사용 중':'현재는 공용 Redis 사용 · 필요 시 기능별 분리 가능'}</span>`;",
  "const isolated=budget.isolatedStores||{},isolatedCount=Object.values(isolated).filter(Boolean).length,redisModes=budget.redisModes||{};\n  const redisModeLabel=value=>({dedicated:'전용','feature-dedicated':'전용','realtime-dedicated':'Realtime 전용','shared-kv':'공용 KV','shared-upstash':'공용 Upstash',none:'미연결'}[value]||'확인 필요');\n  const redisModeSummary=[['운영자',redisModes.operator],['랭킹',redisModes.ranking],['멀티플레이',redisModes.multiplayer],['Push',redisModes.push]].map(([label,mode])=>label+' '+redisModeLabel(mode)).join(' · ');\n  if($('#system-budget-isolation'))$('#system-budget-isolation').innerHTML=`<strong>Redis 기능 격리</strong><span>${escapeHtml(redisModeSummary)} · ${isolatedCount?fmt(isolatedCount)+'개 기능별 전용 저장소 연결':'전용 저장소 연결 대기'}</span>`;",
  'show Redis workload isolation modes'
);

// 3. PWA/runtime asset cache contract: canonical precache, aligned deployment fallback.
replaceOnce('service-worker.js',"const FALLBACK_VERSION = 'runtime-v33';","const FALLBACK_VERSION = 'runtime-v34';",'advance service worker fallback');
for(const [before,after] of [
  ["'/mobile-site.css?v=3'","'/mobile-site.css'"],
  ["'/mobile-runtime-loader.js?v=1'","'/mobile-runtime-loader.js'"],
  ["'/mobile-site.js?v=3'","'/mobile-site.js'"],
  ["'/page.js?v=2'","'/page.js'"]
]) replaceOnce('service-worker.js',before,after,`canonicalize ${before}`);
replaceOnce(
  'service-worker.js',
  "async function boundedNetworkFirst(request, event, timeoutMs = 450) {\n  const cache = await caches.open(CACHE_NAME);\n  const cached = await cache.match(request);",
  "async function matchCanonicalAsset(cache, request) {\n  try {\n    const url = new URL(request.url);\n    if (!url.search) return null;\n    return await cache.match(url.pathname);\n  } catch {\n    return null;\n  }\n}\n\nasync function boundedNetworkFirst(request, event, timeoutMs = 450) {\n  const cache = await caches.open(CACHE_NAME);\n  const cached = await cache.match(request);\n  const canonicalCached = cached ? null : await matchCanonicalAsset(cache, request);",
  'add canonical runtime asset fallback'
);
replaceOnce(
  'service-worker.js',
  "  if (!cached) return await network || Response.error();",
  "  if (!cached) return await network || canonicalCached || Response.error();",
  'use canonical fallback only after network failure'
);
replaceOnce('page.js',"const fallback='runtime-v33';","const fallback='runtime-v34';",'align page service worker fallback');
replaceOnce('operator.html','operator-redis-diagnostics.js?v=1','operator-redis-diagnostics.js?v=2','bust operator diagnostics cache');

// 4. CI budget: cancel superseded checks and skip main regression for non-runtime-only changes.
replaceRegex(
  '.github/workflows/site-audit-tests.yml',
  /\n  push:\n    branches:\n      - fix\/site-audit-20260930\n/,
  '\n',
  'remove stale site audit branch trigger'
);
replaceOnce(
  '.github/workflows/site-audit-tests.yml',
  '\njobs:\n',
  '\nconcurrency:\n  group: site-audit-${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true\n\njobs:\n',
  'add site audit concurrency'
);
replaceOnce(
  '.github/workflows/site-regression.yml',
  "  push:\n    branches: [main]",
  "  push:\n    branches: [main]\n    paths-ignore:\n      - 'docs/**'\n      - 'README.md'\n      - '.github/recovery/**'\n      - '.github/vercel-redeploy-*.txt'",
  'skip non-runtime main regression pushes'
);
replaceOnce(
  '.github/workflows/operator-center-browser-smoke.yml',
  "      - 'operator.js'",
  "      - 'operator.js'\n      - 'operator-redis-diagnostics.js'\n      - 'operator-redis-diagnostics.css'\n      - 'test/operator-redis-degraded-mode.test.js'",
  'cover Redis operator browser changes'
);

// 5. Crew news: remove stale undefined helper from optional VOD fallback.
replaceOnce(
  'api/crew-news-batch.js',
  "  const base = requestBase(req);\n",
  '',
  'remove undefined requestBase helper'
);

console.log('hardening round2 source changes applied');
