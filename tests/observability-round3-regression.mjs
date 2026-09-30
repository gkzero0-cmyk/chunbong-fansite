import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path,'utf8');
const exists = path => fs.existsSync(path);

assert.ok(exists('.github/scripts/production-readiness-gate.mjs'),'shared production readiness gate should exist');
const gate = read('.github/scripts/production-readiness-gate.mjs');
assert.match(gate,/GITHUB_OUTPUT/);
assert.match(gate,/blocked/);
assert.match(gate,/ready/);
assert.doesNotMatch(gate,/process\.exit\(42\)/,'rate limit should not make the job red');

for (const file of [
  '.github/workflows/pwa-production-smoke.yml',
  '.github/workflows/activity-center-production-smoke.yml',
  '.github/workflows/visual-production-check.yml',
  '.github/workflows/production-version-sync.yml'
]) {
  const source=read(file);
  assert.match(source,/production-readiness-gate\.mjs/,`${file} should use the common production gate`);
  assert.match(source,/steps\.production_gate\.outputs\.ready == 'true'/,`${file} should skip expensive checks when production is blocked or stale`);
}

const guardian=read('.github/workflows/production-git-auto-retry.yml');
assert.match(guardian,/per_page=30/,'guardian should cap recent commit scanning at 30');
assert.doesNotMatch(guardian,/per_page=100/,'guardian should not scan 100 commits every hour');

const diagnostics=read('operator-redis-diagnostics.js');
assert.match(diagnostics,/관찰 기반 추정/,'Redis diagnostics should expose an observed estimate when exact usage is unavailable');
assert.match(diagnostics,/70/);
assert.match(diagnostics,/85/);
assert.match(diagnostics,/95/);

assert.ok(exists('lib/operator-observability.js'),'warm-instance observability store should exist');
const observability=read('lib/operator-observability.js');
assert.match(observability,/recordClientHealth/);
assert.match(observability,/recordCollectorResult/);
assert.match(observability,/snapshot/);
assert.match(observability,/consecutiveFailures/);

const siteHealth=read('site-health.js');
assert.match(siteHealth,/0\.02/,'client health sampling should stay at 2%');
assert.match(siteHealth,/client-health/);
assert.match(siteHealth,/keepalive|sendBeacon/);

const contentApi=read('api/content.js');
assert.match(contentApi,/type==='client-health'/,'public client health ingestion route should exist');
assert.match(contentApi,/recordCollectorResult/,'content API should update collector freshness without Redis');

const operatorApi=read('lib/operator-center-api.js');
assert.match(operatorApi,/clientHealth/);
assert.match(operatorApi,/collectorHealth/);

const operatorUi=read('operator.js');
assert.match(operatorUi,/수집기 신선도/);
assert.match(operatorUi,/실사용자 오류/);

console.log('observability round3 regression: ok');
