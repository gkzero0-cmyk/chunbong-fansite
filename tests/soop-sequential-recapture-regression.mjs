import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync(new URL('../operator-soop-recapture-guard.js',import.meta.url),'utf8');
const diagnostics=fs.readFileSync(new URL('../operator-soop-diagnostics.js',import.meta.url),'utf8');
const operator=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
const collector=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');
const redisEntry=fs.readFileSync(new URL('../operator-redis-diagnostics.js',import.meta.url),'utf8');

assert.match(guard,/SOOP_RECAPTURE_SESSION_KEY|RECAPTURE_SESSION_KEY/,'selective recapture needs a shared browser session/lease');
assert.match(guard,/collector-auto-flush/,'sequential recapture must recognize auto-flush operator tabs');
assert.match(guard,/window\.close\(\)/,'auto-flush duplicates should be suppressed while the main sequential controller is active');
assert.match(guard,/operator-content-archive/,'the sequential controller should load the current archive/import state itself');
assert.match(guard,/operator-content-soop-recapture-status/,'the sequential controller should use exact per-post status rather than recent import windows');
assert.match(guard,/recapture-plan/,'the controller should publish one recapture plan instead of many parallel batches');
assert.match(guard,/soop-recapture-step/,'each SOOP page must be opened as a single sequential step');
assert.match(guard,/urls:\s*\[url\]/,'a recapture step must contain exactly one URL');
assert.match(guard,/waitForPostDiagnostic/,'the controller must wait for the current post to finish before opening the next one');
assert.match(guard,/lastDiagnosticPostId/,'step completion must be tied to the actual collector diagnostic for that post');
assert.match(guard,/stopImmediatePropagation\(\)/,'the capture-phase controller must block the legacy parallel click handler');
assert.match(diagnostics,/recapture-plan/,'diagnostics should register the whole sequential plan once');
assert.match(diagnostics,/recapture-finish/,'diagnostics should refresh once when the sequential plan finishes');
assert.match(redisEntry,/operator-soop-diagnostics\.js\?v=3/,'updated diagnostics module must use the v3 cache key');
assert.match(redisEntry,/operator-soop-recapture-guard\.js\?v=3/,'updated recapture guard must use the v3 cache key');
assert.doesNotMatch(guard,/208562045|204274449/,'production controller must not hardcode currently investigated post IDs');
assert.doesNotMatch(diagnostics,/208562045|204274449/,'diagnostic UI must not hardcode currently investigated post IDs');
assert.match(collector,/SOOP_WATCH_INTERVAL_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/,'low-data SOOP watcher cadence must be fifteen minutes');
assert.match(operator,/unresolvedSoopRecaptureTargets/,'legacy target helper may remain for compatibility, while the guard owns the exact plan');

console.log('SOOP sequential recapture regression contract passed');
