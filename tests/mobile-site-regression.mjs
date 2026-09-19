import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('mobile-site.css');
const js=read('mobile-site.js');

const pages=['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','history.html','data.html','changelog.html'];
for(const path of pages){
  const html=read(path);
  assert.match(html,/viewport-fit=cover/,`${path} missing mobile safe-area viewport`);
  assert.match(html,/href="mobile-site\.css"/,`${path} missing mobile-site.css`);
  assert.match(html,/src="mobile-site\.js"/,`${path} missing mobile-site.js`);
}
for(const path of ['chuntris.html','chunbak.html','chungwagame.html','chuncortile.html']){
  const html=read(path);
  assert.doesNotMatch(html,/mobile-site\.css/,`${path} must keep the dedicated minigame mobile layer`);
  assert.match(html,/mobile-minigames\.css/,`${path} dedicated mobile game CSS missing`);
}

assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/\.site-header\{[\s\S]*height:58px!important/,'shared mobile header must be compact');
assert.match(css,/\.main-nav\.open\{display:grid!important\}/,'mobile navigation drawer missing');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'mobile navigation/card two-column primitive missing');
assert.match(css,/body\[data-page="home"\] \.portal-grid\{grid-template-columns:1fr!important/,'home portal must use one column on mobile');
assert.match(css,/body\[data-page="schedule"\] \.schedule-calendar-scroll\{[\s\S]*overflow-x:auto!important/,'schedule calendar must scroll safely');
assert.match(css,/body\[data-page="notice"\] \.notice-toggle\{[\s\S]*grid-template-columns:34px minmax\(0,1fr\) 24px!important/,'notice cards need mobile layout');
assert.match(css,/body\[data-page="vod"\] \.video-layout,[\s\S]*grid-template-columns:1fr!important/,'video pages must stack on mobile');
assert.match(css,/body\[data-page="fanart"\] \.fanart-modal\{[\s\S]*height:100dvh!important/,'fanart dialog should be full-screen on mobile');
assert.match(css,/body\[data-page="tarot"\] \.tarot-choice-group\{[\s\S]*repeat\(2,minmax\(0,1fr\)\)/,'tarot choices must be touch-friendly');
assert.match(css,/body\[data-page="history"\] \.history-layout\{[\s\S]*grid-template-columns:1fr!important/,'history layout must stack on mobile');
assert.match(css,/body\[data-page="data"\] \.data-detail-table\{[\s\S]*overflow-x:auto!important/,'data tables must scroll without overflowing the page');
assert.match(css,/body\[data-page="changelog"\] #changelog-index-list\{[\s\S]*overflow-x:auto!important/,'changelog mobile date index must stay available as a horizontal scroller');
assert.match(css,/\.activity-panel\{[\s\S]*bottom:max\(8px,env\(safe-area-inset-bottom\)\)!important/,'activity center must become a mobile bottom sheet');

assert.match(js,/mobile-site-nav-open/);
assert.match(js,/event\.key==='Escape'/);
assert.match(js,/visualViewport/);
assert.match(js,/mobileScrollable/);
new Function(js);

console.log('Mobile site regression passed');
