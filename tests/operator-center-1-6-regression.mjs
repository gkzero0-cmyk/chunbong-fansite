import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const api=read('lib/operator-center-api.js');
const analytics=read('site-analytics.js');
const improvements=read('site-improvements.js');

assert.match(html,/data-operator-tab="search"/,'search analytics tab missing');
assert.match(html,/id="search-total"/,'search total card missing');
assert.match(html,/id="search-zero-total"/,'zero-result search card missing');
assert.match(html,/id="operator-search-queries"/,'top search queries list missing');
assert.match(html,/id="operator-search-zero"/,'zero-result queries list missing');
assert.match(html,/id="operator-search-clicks"/,'search click list missing');
assert.match(html,/data-operator-quick-tab="contents"/,'quick content action missing');
assert.match(html,/data-operator-quick-tab="performance"/,'quick performance action missing');
assert.match(html,/data-operator-quick-tab="search"/,'quick search action missing');
assert.match(html,/data-operator-quick-tab="system"/,'quick system action missing');

assert.match(improvements,/search_query/,'search query client tracking missing');
assert.match(improvements,/search_result_click/,'search result click tracking missing');
assert.match(improvements,/resultCount:renderedMatchCount/,'search result count tracking missing');
assert.match(improvements,/__ChunbongAnalyticsQueue/,'deferred analytics queue missing');
assert.match(improvements,/data-search-index/,'search result index missing');
assert.match(improvements,/lastTrackedSearch/,'search de-duplication missing');

assert.match(analytics,/__ChunbongAnalyticsQueue/,'analytics queue drain missing');
assert.match(analytics,/track:\(type,target='',extra=\{\}\)/,'extended analytics track API missing');

assert.match(api,/search-queries:v1/,'search query storage missing');
assert.match(api,/search-zero:v1/,'zero-result storage missing');
assert.match(api,/search-clicks:v1/,'search click storage missing');
assert.match(api,/function normalizeSearchTerm/,'search privacy normalizer missing');
assert.match(api,/search_query/,'search query event missing');
assert.match(api,/search_result_click/,'search result click event missing');
assert.match(api,/clickThroughPct/,'search click-through metric missing');
assert.match(api,/topQueries/,'top query response missing');
assert.match(api,/zeroQueries/,'zero query response missing');
assert.match(api,/topClicks/,'search click response missing');

assert.match(js,/function renderSearchInsights/,'search analytics renderer missing');
assert.match(js,/검색 결과 없음/,'zero-result operator attention missing');
assert.match(js,/data-operator-quick-tab/,'quick action binding missing');
assert.match(js,/currentAnalytics\.search\?\.topQueries/,'search CSV export missing');

assert.match(css,/Operator Center 1\.6/,'operator center 1.6 styles missing');
assert.match(css,/operator-quick-actions/,'quick actions layout missing');
assert.match(css,/operator-search-click-row/,'search click row styles missing');

new Function(js);
new Function(api);
new Function(analytics);
new Function(improvements);

console.log('operator center 1.6 search insights regression passed');
