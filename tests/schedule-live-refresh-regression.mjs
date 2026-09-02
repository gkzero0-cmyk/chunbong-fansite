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

const queryBody = schedule.buildCollectionQuery?.(
  'collection-1',
  'view-1',
  { query2: { calendar_by: 'date-property' } }
);
assert.equal(queryBody?.collection?.id, 'collection-1');
assert.equal(queryBody?.collectionView?.id, 'view-1');
assert.equal(queryBody?.loader?.type, 'reducer');
assert.equal(queryBody?.loader?.calendar_by, 'date-property');
assert.equal(queryBody?.loader?.reducers?.collection_group_results?.type, 'results');
assert.equal(queryBody?.loader?.reducers?.collection_group_results?.limit, 100);

const scheduleHtml = fs.readFileSync(new URL('../schedule.html', import.meta.url), 'utf8');
const liveFixes = fs.readFileSync(new URL('../live-fixes.js', import.meta.url), 'utf8');
const pageJs = fs.readFileSync(new URL('../page.js', import.meta.url), 'utf8');

assert.doesNotMatch(scheduleHtml, /schedule-runtime\.js/, 'obsolete official schedule snapshot runtime must stay detached');
assert.match(scheduleHtml, /<script src="live-fixes\.js"><\/script>/, 'schedule page must keep the in-site live refresh runtime');
assert.match(liveFixes, /\/api\/content\?type=schedule/, 'live schedule runtime must fetch the live schedule API');
assert.match(liveFixes, /live\.length \? live : backup/, 'live schedule runtime must preserve the bundled snapshot as fallback');
assert.match(pageJs, /data\.notionSchedule/, 'static schedule snapshot must remain as the fallback renderer');

console.log('schedule live refresh regression test passed');
