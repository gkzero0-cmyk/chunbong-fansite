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

const scheduleHtml = fs.readFileSync(new URL('../schedule.html', import.meta.url), 'utf8');
const runtimeJs = fs.readFileSync(new URL('../schedule-runtime.js', import.meta.url), 'utf8');
const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');

assert.match(scheduleHtml, /<script src="schedule-runtime\.js"><\/script>/, 'schedule page must load its live refresh runtime');
assert.match(runtimeJs, /\/api\/content\?type=schedule/, 'schedule runtime must fetch the live schedule API');
assert.match(runtimeJs, /items\.length/, 'schedule runtime must preserve existing static cards when live items are unavailable');
assert.match(pageJs, /data\.notionSchedule/, 'static schedule snapshot must remain as the fallback renderer');

console.log('schedule live refresh regression test passed');
