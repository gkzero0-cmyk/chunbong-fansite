import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const index=read('index.html');
const styles=read('styles.css');
const version=read('api/version.js');
const improvements=read('site-improvements.js');
const tarotHtml=read('tarot.html');
const tarotJs=read('tarot.js');
const tarotCss=read('tarot-quality.css');
const dataHtml=read('data.html');
const dataEnh=read('data-enhancements.js');
const dataCss=read('data.css');
const serviceWorker=read('service-worker.js');

for(const [name,source] of [
  ['api/version.js',version],
  ['site-improvements.js',improvements],
  ['tarot.js',tarotJs],
  ['data-enhancements.js',dataEnh]
]){
  assert.doesNotThrow(()=>new Function(source),name+' must parse as JavaScript');
}

assert.match(index,/class="portal-feature-grid"/,'home must have a focused featured-content grid');
for(const href of ['vod.html','tarot.html','minigames.html','data.html']){
  assert.match(index,new RegExp('portal-card reveal" href="'+href.replace('.','\\.')+'"'),'featured home content missing '+href);
}
assert.match(index,/class="portal-compact-grid"/,'secondary home destinations must use compact navigation');
assert.match(styles,/\.portal-feature-grid\{display:grid/,'featured home layout styles missing');
assert.match(styles,/\.portal-compact-grid\{display:grid/,'compact home layout styles missing');
assert.match(index,/class="home-all-links reveal"/,'secondary home links should be collapsed behind a single control');
assert.match(index,/class="status-service-mark"/,'SOOP profile should use a neutral service badge');
assert.doesNotMatch(index,/class="status-dot"/,'SOOP profile must not look like a false LIVE indicator');
assert.match(index,/data\.html\?view=calendar#soop"><small>CAL<\/small>/,'calendar shortcut must not duplicate the DATA number');

assert.doesNotMatch(improvements,/api\.github\.com\/repos\/gkzero0-cmyk\/chunbong-fansite\/commits\/main/,'browser must not call GitHub main API directly');
assert.match(improvements,/fetchJson\('\/api\/version',/,'browser deployment sync must use the local version endpoint');
assert.match(improvements,/requestIdleCallback/,'deployment sync check should be deferred until idle time');
assert.match(version,/latestMainCache/,'version endpoint must cache the latest main lookup per warm instance');
assert.match(version,/api\.github\.com\/repos\/gkzero0-cmyk\/chunbong-fansite\/commits\/main/,'server version endpoint must resolve latest main');
assert.match(version,/mainSha,/,'version endpoint must expose latest main SHA');
assert.match(version,/synced:/,'version endpoint must expose sync state');

assert.match(tarotHtml,/data-tarot-mode="quick"/,'tarot must default to quick setup');
assert.match(tarotHtml,/data-tarot-mode-button="quick"/,'quick tarot mode control missing');
assert.match(tarotHtml,/data-tarot-mode-button="detail"/,'detailed tarot mode control missing');
assert.match(tarotHtml,/tarot-detail-only/,'advanced tarot controls must be marked as detail-only');
assert.match(tarotJs,/let setupMode = 'quick'/,'tarot JS must track quick/detail mode');
assert.match(tarotJs,/input\[name="selection-mode"\]\[value="cards"\]/,'quick tarot must default to direct card selection');
assert.match(tarotJs,/Number\(input\?\.dataset\.count\|\|0\)>3/,'quick tarot must hide spreads above three cards');
assert.match(tarotJs,/renderNumberInputs\(Number\(fallback\.dataset\.count\|\|1\)\)/,'quick tarot fallback must keep inputs synchronized');
assert.match(tarotJs,/질문과 1장\/3장을 정한 뒤 카드를 골라 주세요\./,'quick tarot stage guidance must match visible controls');
assert.match(tarotJs,/주제와 스프레드, 카드 선택 방식을 정해 주세요\./,'detail tarot stage guidance must match detailed controls');
assert.match(tarotCss,/Quick \/ detailed tarot setup/,'quick tarot styles missing');

assert.match(dataHtml,/data-data-view="summary"/,'data page must default to summary mode');
assert.match(dataHtml,/data-data-view-button="summary"/,'data summary toggle missing');
assert.match(dataHtml,/data-data-view-button="detail"/,'data detail toggle missing');
assert.ok(dataHtml.indexOf('class="data-platform-tabs') < dataHtml.indexOf('class="data-view-toggle'),'platform selection should appear before analysis-depth controls');
assert.match(dataEnh,/chunbong-data-view-v1/,'data view preference must be remembered');
assert.match(dataEnh,/document\.body\.dataset\.dataView=view/,'data view mode must update body state');
assert.match(dataCss,/body\[data-data-view="summary"\]/,'summary-mode visibility rules missing');
assert.match(dataCss,/content-visibility:auto/,'detailed data sections should use offscreen rendering optimization');
assert.match(serviceWorker,/chunbong-pwa-20260920-v18/,'UX asset changes must advance the PWA cache version');

console.log('UX simplification regression passed');
