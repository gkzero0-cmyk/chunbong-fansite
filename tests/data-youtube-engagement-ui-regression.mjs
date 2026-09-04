import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const js = fs.readFileSync(path.join(root, 'data-enhancements.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'data-enhancements.css'), 'utf8');

for (const token of [
  'youtubeEngagementRange',
  'youtubeEngagementMetric',
  'renderYoutubeEngagement',
  'data-youtube-engagement-range',
  'data-youtube-engagement-metric',
  'allTime',
  'currentMonth',
  'recentThreeMonths',
  '전체',
  '이번 달',
  '최근 3달',
  '조회수',
  '댓글'
]) {
  assert.ok(js.includes(token), `data enhancements should contain ${token}`);
}

assert.match(js, /rankings\?\.\[youtubeEngagementRange\]\?\.\[youtubeEngagementMetric\]/);
assert.match(js, /commentCount/);
assert.match(js, /viewCount/);
assert.match(js, /댓글\s*\$\{numberText\(item\.commentCount\)\}개/);
assert.match(js, /조회수\s*\$\{numberText\(item\.viewCount\)\}/);
assert.match(js, /engagementSignature/);

for (const selector of [
  '.data-engagement-controls',
  '.data-engagement-toggle',
  '.data-engagement-list',
  '.data-engagement-item'
]) {
  assert.ok(css.includes(selector), `engagement CSS should style ${selector}`);
}

console.log('YouTube engagement UI regression test passed');