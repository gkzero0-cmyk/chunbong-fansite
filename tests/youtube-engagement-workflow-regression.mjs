import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = fs.readFileSync(path.join(root, '.github/workflows/chunbong-data-snapshot.yml'), 'utf8');
const smoke = fs.readFileSync(path.join(root, '.github/workflows/production-data-smoke.yml'), 'utf8');

assert.match(snapshot, /node scripts\/update-youtube-engagement-cache\.mjs/);
assert.match(snapshot, /data\/youtube-engagement-cache\.json/);
assert.ok(snapshot.indexOf('update-youtube-engagement-cache.mjs') < snapshot.indexOf('update-chunbong-data.mjs'), 'engagement cache must refresh before production snapshot capture');

for (const token of [
  'youtube.engagement',
  'allTime',
  'currentMonth',
  'recentThreeMonths',
  'views',
  'comments',
  'engagementItemCount',
  'engagementRankingCounts'
]) {
  assert.ok(smoke.includes(token), `production smoke should verify ${token}`);
}
assert.match(smoke, /engagementItemCount\s*>\s*0/);

console.log('YouTube engagement workflow regression test passed');