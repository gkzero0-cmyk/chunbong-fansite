import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeSoopBroadPayload, resolveLiveState } = require('../lib/soop-live-state.js');

const structured = normalizeSoopBroadPayload({
  broad: {
    broad_no: '296999999',
    broad_title: '현재 방송',
    broad_start: '2026-09-06 06:10:00',
    current_sum_viewer: 73,
    cate_no: '00810000',
    cate_name: '버추얼'
  }
}, 'soop-channel');

assert.equal(structured.live, true);
assert.equal(structured.authoritative, true);
assert.equal(structured.broadcastId, '296999999');
assert.equal(structured.title, '현재 방송');
assert.equal(structured.viewerCount, 73);
assert.equal(structured.categoryId, '00810000');
assert.equal(structured.categoryName, '버추얼');

const resolved = resolveLiveState([
  { live: false, authoritative: false, source: 'html-fallback' },
  structured
]);
assert.equal(resolved.live, true, 'explicit structured LIVE must beat stale offline HTML');
assert.equal(resolved.broadcastId, '296999999');

const explicitOffline = normalizeSoopBroadPayload({ broad: null }, 'soop-channel');
assert.equal(explicitOffline.live, false);
assert.equal(explicitOffline.authoritative, true);
assert.equal(resolveLiveState([explicitOffline]).live, false);

const unknown = resolveLiveState([{ live: null, authoritative: false, source: 'failed' }]);
assert.equal(unknown.live, null, 'missing or failed signals must remain unknown instead of false OFFLINE');

console.log('SOOP live state regression test passed');
