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
  "notionFallbackMinutes:360"
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

console.log('operator resource budget visibility regression passed');
