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

const topLevel = normalizeSoopBroadPayload({
  broadNo: 296896937,
  broadCateNo: 40017,
  userId: 'chunbongtv',
  broadTitle: '식당 직원 구했습니다. 근데 일을 잘 못하네요.',
  broadStart: '2026-09-05T07:58:59.000Z',
  currentSumViewer: 78,
  categoryName: '마인크래프트'
}, 'soop-channel');
assert.equal(topLevel.live, true, 'real SOOP section/broad response is a top-level broadcast object');
assert.equal(topLevel.broadcastId, '296896937');
assert.equal(topLevel.viewerCount, 78);
assert.equal(topLevel.categoryId, '40017');
assert.equal(topLevel.categoryName, '마인크래프트');
assert.equal(topLevel.startedAt, '2026-09-05T07:58:59.000Z');

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
