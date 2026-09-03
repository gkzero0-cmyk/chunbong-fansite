import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataHtmlPath = path.join(root, 'data.html');
assert.ok(fs.existsSync(dataHtmlPath), 'data.html should exist');
const dataHtml = fs.readFileSync(dataHtmlPath, 'utf8');
for (const marker of [
  'data-page="data"',
  'id="data-status"',
  'id="data-updated"',
  'data-platform-tab="soop"',
  'data-platform-tab="youtube"',
  'id="data-soop-panel"',
  'id="data-youtube-panel"',
  'data-soop-view-tab="daily"',
  'data-soop-view-tab="monthly"',
  'data-soop-view-tab="calendar"',
  'id="data-soop-overview"',
  'id="data-soop-chart"',
  'id="data-soop-calendar"',
  'id="data-soop-calendar-detail"',
  'id="data-soop-categories"',
  'id="data-soop-sessions"',
  'id="data-youtube-overview"',
  'id="data-youtube-trend"',
  'id="data-youtube-top"',
  'id="data-youtube-recent"',
  'id="data-calendar-prev"',
  'id="data-calendar-next"',
  'href="data.css"',
  'src="data.js"'
]) {
  assert.ok(dataHtml.includes(marker), `data.html should include ${marker}`);
}

const pageNames = ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','tarot.html','youtube.html','data.html'];
for (const pageName of pageNames) {
  const html = fs.readFileSync(path.join(root, pageName), 'utf8');
  assert.ok(html.includes('data-nav="data" href="data.html">춘봉 데이터</a>'), `${pageName} should include Chunbong data nav`);
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(indexHtml.includes('08 / DATA'), 'home portal should include DATA card');
assert.ok(indexHtml.includes('href="data.html"'), 'home portal should link to data page');

const dataJs = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
for (const marker of [
  '/api/content?type=data',
  '300000',
  'document.hidden',
  'renderSoopOverview',
  'renderSoopCharts',
  'renderSoopCalendar',
  'renderSoopCategories',
  'renderYoutubePanel',
  'createSvgChart',
  'measurementBadge',
  'data-chart-value',
  'formatChartValue',
  'Trackify',
  '외부 공개 기록',
  'externalHistory',
  'location.hash'
]) {
  assert.ok(dataJs.includes(marker), `data.js should include ${marker}`);
}

const dataCss = fs.readFileSync(path.join(root, 'data.css'), 'utf8');
for (const className of [
  '.data-platform-tabs',
  '.data-platform-tab',
  '.data-soop-view-tabs',
  '.data-chart-grid',
  '.data-chart-svg',
  '.data-chart-value',
  '.data-chart-tooltip',
  '.data-calendar-grid',
  '.data-calendar-day',
  '.data-calendar-detail',
  '.data-measurement-badge',
  '.data-source-chip',
  '.data-category-row'
]) {
  assert.ok(dataCss.includes(className), `data.css should include ${className}`);
}

console.log('Chunbong data UI regression test passed');
