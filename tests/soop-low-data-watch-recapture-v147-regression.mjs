import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync('chunbong-content-collector.user.js','utf8');
const collector=fs.readFileSync('collector-runtime.js','utf8');
const guard=fs.readFileSync('operator-soop-recapture-guard.js','utf8');
const diagnostics=fs.readFileSync('operator-soop-diagnostics.js','utf8');
const api=fs.readFileSync('lib/operator-soop-recapture-status-api.js','utf8');
const contentApi=fs.readFileSync('api/content.js','utf8');

assert.match(bootstrap,/@version\s+1\.5\.0/,'userscript bootstrap metadata must be v1.5.0');
assert.match(bootstrap,/const BOOTSTRAP_VERSION='1\.5\.0'/,'bootstrap runtime loader version must match metadata');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS=15\*60\*1000/,'watch interval must be 15 minutes');
assert.match(collector,/SOOP_WATCH_ONCE_HASH='chunbong-soop-watch-once'/,'one-shot watch marker must exist');
assert.doesNotMatch(collector,/location\.reload\(\)/,'persistent watch reload must be removed');
assert.match(collector,/watchLease/i,'browser-local watch lease must exist');
assert.match(collector,/window\.close\(\)/,'one-shot watcher must close itself');
assert.doesNotMatch(collector,/208562045|204274449/,'production collector must not hardcode observed post ids');

assert.match(guard,/operator-content-soop-recapture-status/,'recapture guard must use exact per-post status route');
assert.match(guard,/failedIds/,'planner must track lookup failures by exact post id');
assert.match(guard,/planReason:'images-present'/,'planner must preserve image-present exclusion reason');
assert.match(guard,/status-lookup-failed/,'planner must preserve fail-open lookup reason');
assert.match(guard,/recapture-needed/,'planner must preserve zero-image recapture reason');
assert.match(guard,/planRows:lastRecapturePlanRows/,'planner must publish safe plan reasons to operator diagnostics');
assert.doesNotMatch(guard,/browserImports/,'recent browserImports list must not be the final recapture authority');
assert.doesNotMatch(guard,/208562045|204274449/,'production planner must not hardcode observed post ids');

assert.match(diagnostics,/선택 재수집 제외 · 서버 이미지 있음/,'diagnostics must show why image-backed posts were excluded');
assert.match(diagnostics,/선택 재수집 포함 · 이미지 없음/,'diagnostics must show why zero-image posts were included');
assert.match(diagnostics,/정확 상태 조회 실패 · 누락 방지 재수집 포함/,'diagnostics must show fail-open exact lookup status');
assert.match(diagnostics,/PLAN_STORAGE_KEY/,'plan reasons must survive an operator page refresh within the session');

assert.match(api,/MAX_POST_IDS\s*=\s*80/,'exact lookup must be bounded');
assert.match(api,/MGET|mget/i,'exact lookup must use batched key reads');
assert.doesNotMatch(api,/SCAN|KEYS\s/i,'exact lookup must not scan Redis');
assert.match(api,/requireOwner/,'exact lookup must require owner auth');
assert.doesNotMatch(api,/body\s*:/,'endpoint must not return browser body content');
assert.match(contentApi,/operator-content-soop-recapture-status/,'existing content route must multiplex the exact status handler');

console.log('SOOP low-data watcher + exact recapture status runtime regression passed');
