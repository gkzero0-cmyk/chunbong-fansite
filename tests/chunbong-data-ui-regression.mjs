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
  'id="data-summary-grid"',
  'id="data-soop-monthly"',
  'id="data-youtube-monthly"',
  'id="data-top-content"',
  'id="data-recent-content"',
  'id="data-trend-chart"',
  'id="data-updated"',
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
assert.ok(dataJs.includes('/api/content?type=data'), 'data.js should use data API endpoint');
assert.ok(dataJs.includes('300000'), 'data.js should refresh at five minute interval');
assert.ok(dataJs.includes('document.hidden'), 'data.js should pause refresh while document is hidden');

const dataCss = fs.readFileSync(path.join(root, 'data.css'), 'utf8');
for (const className of ['.data-kpi-grid', '.data-platform-grid', '.data-bar', '.data-top-list']) {
  assert.ok(dataCss.includes(className), `data.css should include ${className}`);
}

console.log('Chunbong data UI regression test passed');
