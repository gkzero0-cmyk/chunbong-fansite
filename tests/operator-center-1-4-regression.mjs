import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const api=read('lib/operator-center-api.js');
const analytics=read('site-analytics.js');

for(const id of ['performance-lcp','performance-inp','performance-cls'])assert.match(html,new RegExp(id),'Web Vital card missing: '+id);
assert.match(html,/LCP · 주요 콘텐츠 표시/);
assert.match(html,/INP · 상호작용 반응/);
assert.match(html,/CLS · 화면 흔들림/);
assert.match(html,/지원 브라우저의 실제 이용 표본/);

assert.match(analytics,/largest-contentful-paint/,'LCP PerformanceObserver missing');
assert.match(analytics,/layout-shift/,'CLS PerformanceObserver missing');
assert.match(analytics,/durationThreshold:40/,'INP event timing observer missing');
assert.match(analytics,/type:'web_vital'/,'Web Vital analytics event missing');
assert.match(analytics,/clsWindowStart/,'CLS session-window handling missing');
assert.match(analytics,/Math\.floor\(values\.length\/50\)/,'INP percentile interaction selection missing');
assert.match(analytics,/reportWebVitals\(\);void flush\(\{beacon:true\}\)/,'Web Vitals must flush on page exit');

assert.match(api,/vital-total:v1/,'Web Vital total storage missing');
assert.match(api,/vital-count:v1/,'Web Vital count storage missing');
assert.match(api,/vital-good:v1/,'Web Vital good bucket missing');
assert.match(api,/vital-needs:v1/,'Web Vital needs-improvement bucket missing');
assert.match(api,/vital-poor:v1/,'Web Vital poor bucket missing');
assert.match(api,/webVitalSummary/,'Web Vital aggregate helper missing');
assert.match(api,/analyticsBreakdownsForDates/,'previous-period breakdown loader missing');
assert.match(api,/compareRows/,'row comparison response helper missing');
assert.match(api,/previousValue/,'previous row value missing');
assert.match(api,/changePct/,'row change percentage missing');
assert.match(api,/performance:\{averageMs:[^\n]+webVitals/,'Web Vitals must be returned under performance');

assert.match(js,/rowCompareMarkup/,'ranking comparison UI missing');
assert.match(js,/이전 기간 0회/,'zero-baseline comparison label missing');
assert.match(js,/renderVital/,'Web Vital renderer missing');
assert.match(js,/나쁨 구간 표본/,'Web Vital attention signal missing');

assert.match(css,/Operator Center 1\.4/,'Operator Center 1.4 styles missing');
assert.match(css,/operator-row-compare/,'ranking comparison chip styles missing');
assert.match(css,/operator-vitals-summary/,'Web Vital card layout missing');

new Function(js);
new Function(api);
new Function(analytics);

console.log('operator center 1.4 Web Vitals and comparison regression passed');
