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
  "notionFallbackMinutes:180"
]) assert.ok(api.includes(token),token+' missing');

assert.match(ui,/아카이브 메타 캐시/);
assert.match(ui,/Push 저장/);
assert.match(ui,/SOOP 수집/);
assert.match(ui,/Notion 백업/);
assert.match(ui,/이미지 CDN 캐시/);

console.log('operator resource budget visibility regression passed');
