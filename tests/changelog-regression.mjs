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
assert.ok(groups.some(group=>group.date==='2026-09-13'&&group.items.some(item=>/춘박게임 추가/.test(item.title))),'requested 2026-09-13 Chunbak entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-16'&&group.items.some(item=>/랭킹 기능 추가/.test(item.title))),'requested 2026-09-16 ranking entry missing');

assert.match(content,/className = 'changelog-button'/,'shared header bootstrap must create changelog button');
assert.match(content,/link\.href = 'changelog\.html'/);
assert.match(content,/업데이트 일지/);
assert.match(activity,/changelogButton/,'activity bell must position itself after changelog button');
assert.match(theme,/\.changelog-button\{/);
assert.match(theme,/\.changelog-button span\{display:none\}/,'mobile changelog control should collapse to icon only');

console.log('changelog regression passed');
