import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { normalizeSoopPlayHtml }=require('../lib/soop-live-state.js');

assert.equal(typeof normalizeSoopPlayHtml,'function','SOOP play-page normalizer must be exported');

const live=normalizeSoopPlayHtml(`
<html><script>window.nBroadNo = 297123456;</script>
<script>window.__STATE__={"broad_title":"오늘의 춘봉 방송","broad_start":"2026-09-21 07:00:00","viewer_count":"88"}</script></html>
`,'soop-play-page');
assert.equal(live.live,true);
assert.equal(live.authoritative,true);
assert.equal(live.broadcastId,'297123456');
assert.equal(live.title,'오늘의 춘봉 방송');
assert.equal(live.viewerCount,88);

const offline=normalizeSoopPlayHtml('<main><p>Streamer is offline.</p></main>','soop-play-page');
assert.equal(offline.live,false);
assert.equal(offline.authoritative,true);

const koreanOffline=normalizeSoopPlayHtml('<p>스트리머가 오프라인입니다.</p>','soop-play-page');
assert.equal(koreanOffline.live,false);
assert.equal(koreanOffline.authoritative,true);

const unknown=normalizeSoopPlayHtml('<html><body>SOOP</body></html>','soop-play-page');
assert.equal(unknown.live,null);
assert.equal(unknown.authoritative,false);

console.log('SOOP play-page live alert regression passed');
