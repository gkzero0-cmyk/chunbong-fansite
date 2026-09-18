import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../changelog.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../changelog.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../changelog.js',import.meta.url),'utf8');
const dataSource=fs.readFileSync(new URL('../changelog-data.js',import.meta.url),'utf8');
const content=fs.readFileSync(new URL('../content.js',import.meta.url),'utf8');
const activity=fs.readFileSync(new URL('../activity-center.js',import.meta.url),'utf8');
const theme=fs.readFileSync(new URL('../theme.css',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');

assert.doesNotThrow(()=>new Function(js),'changelog runtime must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(dataSource),'changelog data must remain valid JavaScript');
assert.match(html,/data-page="changelog"/);
assert.match(html,/id="changelog-timeline"/);
assert.match(html,/changelog-data\.js/);
assert.match(html,/changelog\.js/);
assert.match(css,/\.changelog-day/);
assert.match(css,/grid-template-columns:180px minmax\(0,1fr\)/);
assert.match(css,/@media\(max-width:760px\)/);

const sandbox={window:{}};
vm.runInNewContext(dataSource,sandbox);
const groups=sandbox.window.CHUNBONG_CHANGELOG;
assert.ok(Array.isArray(groups)&&groups.length>=2,'changelog needs dated groups');
for(const group of groups){
  assert.match(group.date,/^20\d{2}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(group.items)&&group.items.length>0,'each date must contain updates');
}
const sorted=[...groups].sort((a,b)=>b.date.localeCompare(a.date));
assert.equal(sorted[0].date,'2026-09-18','latest changelog date should be first');
assert.ok(groups.some(group=>group.date==='2026-09-17'&&group.items.some(item=>item.title==='춘박게임 추가')),'actual 2026-09-17 Chunbak entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-18'&&group.items.some(item=>/랭킹 등록 방식 개선/.test(item.title))),'actual 2026-09-18 ranking update entry missing');

assert.match(content,/className = 'changelog-button'/,'shared header bootstrap must create changelog button');
assert.match(content,/link\.href = 'changelog\.html'/);
assert.match(content,/업데이트 일지/);
assert.match(activity,/changelogButton/,'activity bell must position itself after changelog button');
assert.match(theme,/\.changelog-button\{/);
assert.match(theme,/\.changelog-button\{[^}]*width:42px/,'changelog control should be icon-sized on desktop too');
assert.match(theme,/\.changelog-button span\{display:none\}/,'changelog label should always be hidden');
assert.match(theme,/@media\(min-width:761px\) and \(max-width:1500px\)/,'desktop header compact breakpoint missing');
assert.match(theme,/\.site-header \.main-nav a\{[^}]*white-space:nowrap/,'desktop navigation labels must stay on one line');
assert.match(content,/nav-minigames-submenu/,'shared header must create a minigames submenu');
for(const href of ['chuntris.html','chunbak.html','chungwagame.html']) assert.match(content,new RegExp('href="'+href.replace('.','\\.')+'"'),'minigames submenu link missing: '+href);
assert.match(styles,/\.nav-minigames:hover \.nav-minigames-submenu/,'desktop minigames submenu must open on hover');
assert.match(styles,/\.nav-minigames:focus-within \.nav-minigames-submenu/,'minigames submenu must support keyboard focus');
assert.match(styles,/@media\(max-width:760px\)[\s\S]*?\.nav-minigames-submenu\{display:none!important\}/,'mobile hamburger menu must keep the hover submenu hidden');

console.log('changelog regression passed');
