import fs from 'node:fs';
import assert from 'node:assert/strict';

const bootstrap=fs.readFileSync('chunbong-content-collector.user.js','utf8');
const collector=fs.readFileSync('collector-runtime.js','utf8');
const manifest=JSON.parse(fs.readFileSync('collector-runtime-manifest.json','utf8'));
const guard=fs.readFileSync('operator-soop-recapture-guard.js','utf8');
const diagnostics=fs.readFileSync('operator-soop-diagnostics.js','utf8');
const api=fs.readFileSync('lib/operator-soop-recapture-status-api.js','utf8');
const contentApi=fs.readFileSync('api/content.js','utf8');

assert.match(bootstrap,/@version\s+1\.5\.0/,'userscript bootstrap metadata must stay v1.5.0');
assert.match(bootstrap,/const BOOTSTRAP_VERSION='1\.5\.0'/,'bootstrap runtime loader version must stay unchanged');
assert.equal(manifest.runtimeVersion,'1.0.1','adaptive watcher remains runtime 1.0.1 for the operator-button fallback repair');
assert.match(collector,/SOOP_WATCH_ACTIVE_MS=15\*60\*1000/,'active watcher interval must be 15 minutes');
assert.match(collector,/SOOP_WATCH_NORMAL_MS=30\*60\*1000/,'normal watcher interval must be 30 minutes');
assert.match(collector,/SOOP_WATCH_IDLE_MS=60\*60\*1000/,'idle watcher interval must be 60 minutes');
assert.match(collector,/SOOP_WATCH_ERROR_MAX_MS=120\*60\*1000/,'error backoff must cap at 120 minutes');
assert.match(collector,/function nextSoopWatchPolicy\(/,'adaptive watcher policy helper must exist');
assert.match(collector,/currentWatchIntervalMs/,'watcher must publish the active interval for diagnostics');
assert.match(collector,/watchNoChangeStreak/,'watcher must track consecutive no-change scans');
assert.match(collector,/watchErrorStreak/,'watcher must track consecutive failures');
assert.match(collector,/remote[^\n]*scheduleWatch\(false\)/,'remote watcher results must reschedule the operator timer');
assert.match(collector,/SOOP_WATCH_ONCE_HASH='chunbong-soop-watch-once'/,'one-shot watch marker must exist');
assert.doesNotMatch(collector,/location\.reload\(\)/,'persistent watch reload must be removed');
assert.match(collector,/watchLease/i,'browser-local watch lease must exist');
assert.match(collector,/window\.close\(\)/,'one-shot watcher must close itself');
assert.match(collector,/AUTO_OPEN_MAX_ACTIVE=1/,'automatic collector tabs must remain serialized');
assert.doesNotMatch(collector,/208562045|204274449/,'production collector must not hardcode observed post ids');

const constant=(name)=>Number(collector.match(new RegExp(`const ${name}=(\\d+)\\*60\\*1000`))?.[1]||0)*60*1000;
const body=collector.match(/function nextSoopWatchPolicy\(result=\{\},previous=\{\}\)\{([\s\S]*?)\n  \}/)?.[1];
assert.ok(body,'adaptive watcher policy body should be extractable for behavioral regression coverage');
const nextPolicy=new Function('SOOP_WATCH_ACTIVE_MS','SOOP_WATCH_NORMAL_MS','SOOP_WATCH_IDLE_MS','SOOP_WATCH_ERROR_MAX_MS',`return (result={},previous={})=>{${body}}`)(
  constant('SOOP_WATCH_ACTIVE_MS'),constant('SOOP_WATCH_NORMAL_MS'),constant('SOOP_WATCH_IDLE_MS'),constant('SOOP_WATCH_ERROR_MAX_MS')
);
let policy=nextPolicy({ok:true,discovered:1},{watchNoChangeStreak:5,watchErrorStreak:2});
assert.equal(policy.intervalMs,15*60*1000,'new activity must return the watcher to 15 minutes');
assert.equal(policy.noChangeStreak,0);
assert.equal(policy.errorStreak,0);
policy=nextPolicy({ok:true,discovered:0},{watchNoChangeStreak:0,watchErrorStreak:0});
assert.equal(policy.intervalMs,30*60*1000,'first no-change scan should use 30 minutes');
policy=nextPolicy({ok:true,discovered:0},{watchNoChangeStreak:2,watchErrorStreak:0});
assert.equal(policy.intervalMs,60*60*1000,'third consecutive no-change scan should use 60 minutes');
policy=nextPolicy({ok:false,discovered:0},{watchNoChangeStreak:3,watchErrorStreak:0});
assert.equal(policy.intervalMs,30*60*1000,'first error should back off to 30 minutes');
policy=nextPolicy({ok:false,discovered:0},{watchNoChangeStreak:3,watchErrorStreak:1});
assert.equal(policy.intervalMs,60*60*1000,'second consecutive error should back off to 60 minutes');
policy=nextPolicy({ok:false,discovered:0},{watchNoChangeStreak:3,watchErrorStreak:2});
assert.equal(policy.intervalMs,120*60*1000,'third consecutive error should cap at 120 minutes');
policy=nextPolicy({ok:true,discovered:0},{watchNoChangeStreak:1,watchErrorStreak:3});
assert.equal(policy.errorStreak,0,'a successful scan should clear the error streak');

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

console.log('SOOP adaptive low-data watcher + exact recapture status runtime regression passed');
