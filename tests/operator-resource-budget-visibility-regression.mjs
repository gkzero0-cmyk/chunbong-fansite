import fs from 'node:fs';
import assert from 'node:assert/strict';

const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');

for(const token of [
  "publicContentSingleFlight:true",
  "archiveSourceMetaCacheSeconds:300",
  "archiveSourceMetaSingleFlight:true",
  "upstreamJsonCacheSeconds:60",
  "imageProxyCdnCacheSeconds:604800",
  "pushSubscriptionStore:'redis-hash-v2'",
  "pushFallbackMinutes:60",
  "soopTelemetryMinutes:10",
  "soopOfflineExtendedMinutes:60",
  "youtubeIncrementalDiscovery:true",
  "youtubeDailyRecentLimit:30",
  "youtubeStaleRefreshLimit:20",
  "notionFallbackMinutes:360",
  "validatedDailySnapshot:true",
  "providerOutagePreservesCache:true",
  "analyticsDeferredBufferHours:48",
  "analyticsDeferredMaxEvents:120",
  "analyticsReplayPreservesEventTime:true",
  "operatorCenterRedisReadOnOpen:false",
  "operatorAnalyticsAutoRefresh:false",
  "operatorSessionIndexValidation:false",
  "upstashManagementStatsNoRedisCommands:true"
]) assert.ok(api.includes(token),token+' missing');

assert.match(ui,/아카이브 메타 캐시/);
assert.match(ui,/Push 저장/);
assert.match(ui,/SOOP LIVE 확인/);
assert.match(ui,/SOOP OFF 확장수집/);
assert.match(ui,/YouTube 증분 탐색/);
assert.match(ui,/Notion 백업/);
assert.match(ui,/이미지 CDN 캐시/);
assert.match(api,/quotaSignals=\[/);
assert.match(api,/automaticSaving:quotaLevel!=='normal'/);
assert.match(ui,/quotaSignals/);
assert.match(ui,/level==='limit'\?'제한':level==='warn'\?'절약':'정상'/);
assert.match(api,/quotaEventMemory=\[\]/);
assert.match(api,/recentQuotaEvents/);
assert.match(api,/retryAfterSeconds=\(name==='redis_service_limit'\|\|name==='redis_circuit_open'\)\?43200:21600/);
assert.match(ui,/24시간 제한 이벤트/);
assert.match(ui,/일일 검증 복구본/);
assert.match(ui,/외부 장애 캐시 보존/);
assert.match(ui,/분석 임시 보관/);
assert.match(ui,/지연 분석 원래 시각 보존/);
assert.match(ui,/운영자 센터 기본 열기 · Redis 직접 조회 없음/);
assert.match(ui,/분석 자동 갱신 없음/);
assert.match(ui,/월간 사용량 관리 API/);
assert.match(api,/VERCEL_LIMIT_STATE_KEY='operator:vercel-limit-state:v1'/);
assert.match(ui,/system-quota-breakdown/);
assert.match(ui,/Vercel 회복/);

console.log('operator resource budget visibility regression passed');
