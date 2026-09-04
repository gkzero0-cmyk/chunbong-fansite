import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const dataCss = fs.readFileSync(path.join(root, 'data.css'), 'utf8');
const contentApi = fs.readFileSync(path.join(root, 'api', 'content.js'), 'utf8');

for (const marker of [
  'monthlyStarCount',
  'starsPerHour',
  'monthlyChatCount',
  'monthlyKickCount',
  'monthlyMuteCount',
  'stationOpenedAt',
  'latestBroadcastDate',
  'categoryRankings',
  'latestYoutubeSnapshot',
  'mergeYoutubeRecent',
  'data-chart-crosshair',
  'data-chart-hover',
  'refresh=1',
  '_ts=',
  "cache:'no-store'",
  'data-retry-loading'
]) {
  assert.ok(dataJs.includes(marker), `data.js should include ${marker}`);
}

for (const marker of ['.data-chart-hover', '.data-chart-crosshair', '.data-kpi-secondary', '.data-rank-list', '.data-status button:disabled']) {
  assert.ok(dataCss.includes(marker), `data.css should include ${marker}`);
}

assert.ok(contentApi.includes("req.query?.refresh"), 'content API should inspect refresh query');
assert.ok(contentApi.includes("no-store, max-age=0"), 'forced data refresh should disable CDN caching');
assert.ok(contentApi.includes("type==='data'"), 'refresh cache policy should remain scoped to data endpoint');

console.log('Data dashboard UI reliability regression test passed');
