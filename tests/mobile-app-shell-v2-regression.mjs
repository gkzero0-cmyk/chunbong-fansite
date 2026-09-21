import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('mobile-site.js');
const css=read('mobile-site.css');
const live=read('live-fixes.js');

assert.match(js,/mobile-home-dashboard-mode/,'all mobile home must use the app dashboard mode');
assert.match(js,/mobile-compact-header/,'all mobile pages must get the compact app header');
assert.match(js,/data-mobile-theme-toggle/,'More sheet must expose theme control');

assert.match(css,/body\.mobile-home-dashboard-mode \.hero\{[^}]*display:none!important/s,'mobile marketing hero should be removed from app-style home');
assert.match(css,/body\.mobile-home-dashboard-mode \.portal-section\{[^}]*display:none!important/s,'mobile duplicate portal section should be removed');
assert.match(css,/body\.mobile-tabbar-mode footer\{[^}]*display:none!important/s,'mobile footer should not duplicate app navigation');
assert.match(css,/\.mobile-compact-header[^}]*flex-wrap:nowrap!important/s,'mobile compact header must remain one row');

assert.match(css,/body\[data-page="schedule"\] \.schedule-view-toolbar\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/s,'schedule view tabs must fit without horizontal scrolling');
assert.match(css,/body\[data-page="schedule"\] \.mobile-schedule-week\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/s,'7-day schedule selector must fit seven columns');
assert.match(css,/body\[data-page="schedule"\] :is\(\.schedule-calendar-week,\.schedule-calendar-grid\)\{[^}]*min-width:0!important/s,'schedule month calendar must not force horizontal width');
assert.match(live,/schedule-calendar-mobile-detail/,'schedule calendar needs a selected-day detail panel');

assert.match(css,/body\[data-page="data"\] \.data-detail-table\{[^}]*overflow:visible!important/s,'mobile data tables must not horizontally scroll');
assert.match(css,/body\[data-page="data"\] \.data-detail-row\{[^}]*min-width:0!important/s,'mobile data rows must become cards');
assert.match(css,/body\[data-page="data"\] \.data-detail-header\{[^}]*display:none!important/s,'desktop data table header must disappear on card layout');
assert.match(css,/body\[data-page="data"\] \.data-calendar-wrap\{[^}]*overflow:visible!important/s,'data calendar must not horizontally scroll');
assert.match(css,/body\[data-page="data"\] \.data-calendar-grid\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/s,'data calendar must fit seven columns');
assert.match(css,/body\[data-page="data"\] \.data-chart-grid\{[^}]*scroll-snap-type:x mandatory!important/s,'multiple data charts should use an intentional swipe rail');

new Function(js);
new Function(live);
console.log('mobile app shell v2 regression passed');
