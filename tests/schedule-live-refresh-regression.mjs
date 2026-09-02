import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const schedule = require('../api/schedule.js');

const nestedRecordMap = {
  block: {
    calendar: {
      value: {
        value: {
          id: 'calendar',
          type: 'collection_view',
          collection_id: 'collection-1',
          view_ids: ['view-1']
        },
        role: 'reader'
      }
    }
  }
};

assert.deepEqual(
  schedule.findCollection(nestedRecordMap),
  { collectionId: 'collection-1', viewId: 'view-1' },
  'schedule parser must unwrap current Notion value.value record wrappers'
);

const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');
assert.match(pageJs, /schedule:\s*['"]\/api\/content\?type=schedule['"]/, 'schedule page must have a live schedule API endpoint');

const renderStart = pageJs.indexOf('async function renderSchedulePage()');
const renderEnd = pageJs.indexOf('function setupNoticeImageZoom', renderStart);
const renderSchedule = pageJs.slice(renderStart, renderEnd);
assert.match(renderSchedule, /loadContent\(['"]schedule['"]\)/, 'schedule page must fetch the live schedule API');
assert.match(renderSchedule, /data\.notionSchedule/, 'static schedule must remain only as a fallback when the live API fails');

console.log('schedule live refresh regression test passed');
