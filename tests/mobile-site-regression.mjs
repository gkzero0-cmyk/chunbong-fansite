import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('mobile-site.css');
const js=read('mobile-site.js');

const pages=['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','history.html','data.html','changelog.html' ,'myhub.html'];
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
assert.match(js,/display-mode: standalone/,'installed-app detection missing');
assert.match(js,/source'\)===\'pwa\'/,'PWA launch-source detection missing');
assert.match(js,/data-pwa-app-tabbar/,'mobile bottom tabbar missing');
assert.match(js,/mobile-tabbar-mode/,'regular mobile browsers should receive the bottom navigation mode');
assert.match(js,/data-pwa-app-more-toggle/,'installed app more menu control missing');
assert.match(js,/data-pwa-ios-install/,'iOS Safari install helper missing');
assert.match(js,/pwa-app-keyboard-open/,'app tabbar must react to the mobile keyboard');
assert.doesNotMatch(js,/mobile\.matches&&appMode&&window\.visualViewport/,'regular mobile keyboard must hide the bottom bar too');
assert.match(css,/body\.mobile-tabbar-mode\.pwa-app-more-open/,'regular mobile More sheet must lock background scrolling');
assert.match(css,/body\.mobile-tabbar-mode \.pwa-install-chip,[\s\S]*\.pwa-ios-install-chip,[\s\S]*\.deploy-sync-chip/,'fixed mobile notices and iOS install help must clear the bottom navigation');
assert.match(css,/\.pwa-app-tabbar\{/,'mobile tabbar styles missing');
assert.match(css,/@media\(min-width:761px\)\{[\s\S]*\.pwa-app-tabbar,[\s\S]*display:none!important/,'mobile tabbar must disappear above the mobile breakpoint');
assert.match(js,/모바일 빠른 메뉴/,'bottom navigation needs a browser-neutral accessible label');
assert.match(css,/body\.mobile-tabbar-mode:not\(\[data-game\]\)/,'regular mobile browser bottom spacing missing');
assert.match(css,/content-visibility:auto/,'long mobile card lists should defer off-screen painting');
assert.match(css,/backdrop-filter:blur\(8px\)!important/,'mobile header/menu blur should be reduced');
assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/,'app tabbar must expose five primary controls');
assert.match(css,/\.pwa-app-more-sheet\{/,'installed app more sheet styles missing');
assert.match(css,/\.pwa-ios-install-chip\{/,'iOS home-screen install helper styles missing');
assert.match(css,/body\.pwa-app-mode \.daily-fortune-launcher,[\s\S]*body\.mobile-tabbar-mode \.daily-fortune-launcher\{/,'daily fortune launcher must clear the mobile tabbar');
assert.match(css,/body\.pwa-app-mode \.activity-panel,[\s\S]*body\.mobile-tabbar-mode \.activity-panel\{/,'activity panel must clear the mobile tabbar');
new Function(js);

console.log('Mobile site regression passed');
