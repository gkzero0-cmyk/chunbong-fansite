import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const home=read('index.html');
const improvements=read('site-improvements.js');
const improvementCss=read('site-improvements.css');
const fortune=read('daily-fortune.js');
const overviewCss=read('home-overview.css');

assert.doesNotThrow(()=>new Function(improvements),'site improvement runtime must remain valid JavaScript');
assert.equal((home.match(/id="home-overview-title"/g)||[]).length,1,'home must keep a single Today overview section');
assert.doesNotMatch(improvements,/home-today-dashboard|buildHomeDashboard/,'shared improvements must not inject a duplicate Today dashboard');
assert.match(home,/data-home-overview-fortune/,'existing Today overview must include daily fortune');
assert.match(fortune,/data-home-overview-fortune/,'daily fortune runtime must open from the Today overview card');
assert.match(overviewCss,/repeat\(4,minmax\(0,1fr\)\)/,'desktop Today overview must support five cards');
assert.match(overviewCss,/@media\(max-width:1050px\).*repeat\(2,minmax\(0,1fr\)\)/s,'Today overview must collapse to two columns on narrower screens');

for(const type of ['schedule','notice','vod','clips','youtube']){
  assert.ok(improvements.includes('/api/content?type='+type),'global search missing '+type+' content source');
}
assert.match(improvements,/notice-detail&id=202862381/,'global search must index broadcast history text');
assert.match(improvements,/changelog-history&since=2026-08-30/,'global search must index update history');
assert.match(improvements,/href:'myhub\.html',label:'내 팬허브'/,'global search must expose My Fan Hub');
assert.match(improvements,/href:'timeline\.html',label:'춘봉 타임라인'/,'global search must expose Chunbong timeline');
assert.match(improvements,/href:'data\.html\?view=calendar#soop',label:'방송 기록 캘린더'/,'global search must expose broadcast calendar');
assert.match(improvements,/\/api\/content\?type=data/,'global search must index measured broadcast records');
assert.match(home,/data-home-overview-card="challenge"/,'Today overview must expose daily minigame challenge');
assert.match(home,/data-home-quick-stats/,'home must expose simple broadcast statistics');
assert.match(home,/data\.html\?view=calendar#soop/,'home must link to the broadcast archive calendar');
assert.match(improvements,/aria-activedescendant/,'global search must expose keyboard selection to assistive technology');
assert.match(improvements,/aria-keyshortcuts/,'global search trigger must expose its keyboard shortcut');
assert.match(improvements,/aria-busy','true'/,'global search must announce content loading');
assert.match(improvements,/aria-busy','false'/,'global search must clear loading state after indexing');
assert.match(improvements,/normalize\(input\.value\)\.length>=2/,'content search must lazy-load only after two characters');
assert.match(improvementCss,/site-search-result-copy/,'global search result layout styles missing');
assert.match(improvementCss,/\[data-theme="light"\] \.site-search-dialog/,'global search must support light theme');
assert.doesNotMatch(improvementCss,/home-today-dashboard|home-today-card/,'duplicate dashboard styles must be removed');

console.log('global search + home overview cleanup regression passed');
