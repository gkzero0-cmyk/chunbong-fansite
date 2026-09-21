import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const api=read('lib/operator-center-api.js');
const router=read('api/content.js');
const analytics=read('site-analytics.js');
const improvements=read('site-improvements.js');
const improvementCss=read('site-improvements.css');

assert.match(html,/data-operator-tab="performance"/,'performance tab missing');
assert.match(html,/operator-period-summary-text/,'period comparison summary missing');
assert.match(html,/페이지 이용 순위/,'friendly page ranking title missing');
assert.match(html,/방문이 많은 시간대/,'friendly hourly title missing');
assert.match(html,/operator-performance-pages/,'page performance list missing');
assert.match(html,/operator-feedback-priority-filter/,'feedback priority filter missing');
assert.match(html,/feedback-tags/,'feedback tags control missing');
assert.match(html,/feedback-related-update/,'related update control missing');
assert.match(html,/system-vercel-status/,'Vercel deployment status missing');
assert.match(html,/system-retry-at/,'automatic retry status missing');
assert.match(html,/operator-health-history/,'health history missing');
assert.match(html,/operator-security-log/,'security activity list missing');

for(const token of ['PAGE_LABELS','renderPageRows','renderMenuRows','renderPeriodSummary','renderPerformance','renderHealthHistory','loadSecurityLog']){
  assert.ok(js.includes(token),'operator runtime missing '+token);
}
assert.match(js,/어제 대비/,'today comparison label missing');
assert.match(js,/이전 \$\{currentDays\}일 대비/,'period comparison label missing');
assert.match(js,/평균 활동/,'explicit page engagement label missing');
assert.match(js,/메뉴 클릭/,'explicit menu click unit missing');
assert.match(js,/가장 활발한 시간/,'hourly peak summary missing');
assert.match(js,/operator-security-log/,'security API runtime missing');
assert.match(js,/priorityValue/,'feedback priority persistence missing');
assert.match(js,/tagsValue/,'feedback tags persistence missing');
assert.match(js,/relatedUpdateValue/,'feedback related update persistence missing');

assert.match(api,/navigation_timing/,'navigation performance event type missing');
assert.match(api,/perfTotal/,'performance total storage missing');
assert.match(api,/perfCount/,'performance sample storage missing');
assert.match(api,/performance:\{averageMs/,'performance analytics response missing');
assert.match(api,/FEEDBACK_PRIORITY/,'feedback priority allowlist missing');
assert.match(api,/relatedUpdate/,'related update persistence missing');
assert.match(api,/securityLogList/,'security log retrieval missing');
assert.match(api,/handleOperatorSecurityLog/,'security log handler missing');
assert.match(api,/HEALTH_INDEX/,'health change history missing');
assert.match(api,/recordHealthState/,'health transition recorder missing');
assert.match(api,/rateLimited/,'Vercel rate-limit status missing');
assert.match(api,/retryAfter/,'safe automatic retry time missing');
assert.match(router,/operator-security-log/,'operator security route missing');

assert.match(analytics,/navigation_timing/,'client page timing event missing');
assert.match(analytics,/domContentLoadedEventEnd/,'navigation timing must use DOM ready timing');
assert.doesNotMatch(analytics,/email|nickname/i,'performance analytics must remain anonymous');

assert.match(improvements,/operator-session/,'quick access must verify operator session');
assert.match(improvements,/operator-quick-link/,'desktop operator entry missing');
assert.match(improvements,/data-more-page="operator"/,'mobile operator entry missing');
assert.match(improvements,/event\.pointerType!=='touch'/,'MY long-press must be touch-only');
assert.match(improvements,/event\.ctrlKey\|\|event\.metaKey/,'operator keyboard shortcut missing');
assert.match(improvementCss,/operator-quick-link/,'operator quick entry styling missing');

assert.match(css,/Operator Center 1\.2/);
assert.match(css,/operator-rank-rich/,'ranking comparison bars missing');
assert.match(css,/operator-day-values/,'daily chart values missing');
assert.match(css,/operator-event-row/,'health/security timeline styling missing');

new Function(api);
new Function(router);
new Function(analytics);
new Function(improvements);
new Function(js);

console.log('operator center 1.2 regression passed');
