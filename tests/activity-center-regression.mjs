import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { buildActivityFeed, parsePublishedAt }=require('../lib/activity-feed.js');
const fetchActivity=require('../lib/activity.js');
const { selectActivitySchedule }=fetchActivity;

const now=new Date('2026-09-18T09:30:00.000Z');
assert.equal(parsePublishedAt('2026-09-18 18:19:00',now).publishedAt,'2026-09-18T09:19:00.000Z');
assert.equal(parsePublishedAt(1789718400000,now).precision,'datetime');

const items=buildActivityFeed({
  schedule:[{title:'저녁 방송',start:'2026-09-18T17:30:00+09:00',tags:['마인크래프트'],link:'https://example.com/schedule'}],
  notice:[{id:'9001',title:'휴방 공지 (세팅 이슈)',sortDate:'2026-09-18 18:19:00',link:'https://example.com/notice'}],
  fanart:[{id:'8001',title:'가을 팬아트',author:'팬작가',dateIso:'2026-09-18T08:10:00.000Z',link:'https://example.com/fanart'}],
  clips:{catch:[{id:'7001',title:'오늘의 CATCH',sortDate:'2026-09-18 16:00:00'}],clip:[]},
  vod:[],
  youtube:{videos:[{id:'abcdefghijk',title:'오늘의 영상',dateIso:'2026-09-18T06:00:00.000Z'}],shorts:[{id:'lmnopqrstuv',title:'오늘의 쇼츠',dateIso:'2026-09-18T10:00:00.000Z'}]}
},{now});
assert.equal(items[0].type,'shorts','newest item must sort first');
const notice=items.find(item=>item.type==='notice');assert.equal(notice.title,'휴방 공지 (세팅 이슈)');assert.equal(notice.href,'notice.html?open=9001');assert.equal(notice.group,'notice');
assert.match(items.find(item=>item.type==='fanart').href,/fanart\.html\?open=8001/);assert.match(items.find(item=>item.type==='shorts').href,/youtube\.html\?kind=shorts&open=lmnopqrstuv/);
const schedule=items.find(item=>item.type==='schedule');assert.equal(schedule.group,'schedule');assert.equal(schedule.href,'schedule.html');assert.equal(schedule.meta,'마인크래프트');assert.equal(schedule.publishedAt,'2026-09-18T08:30:00.000Z');
const selectedSchedule=selectActivitySchedule([{title:'너무 오래된 일정',start:'2026-09-01T20:00:00+09:00'},{title:'최근 일정',start:'2026-09-17T20:00:00+09:00'},{title:'가까운 예정',start:'2026-09-19T20:00:00+09:00'},{title:'먼 미래',start:'2026-11-30T20:00:00+09:00'}],now);
assert.deepEqual(selectedSchedule.map(item=>item.title),['최근 일정','가까운 예정'],'activity schedule must keep only nearby recent/upcoming rows');

const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
const idle=fs.readFileSync(new URL('../site-shell-idle.js',import.meta.url),'utf8');
const activityJs=fs.readFileSync(new URL('../activity-center.js',import.meta.url),'utf8');
const activityCss=fs.readFileSync(new URL('../activity-center.css',import.meta.url),'utf8');
const pageJs=fs.readFileSync(new URL('../page.js',import.meta.url),'utf8');
const apiContent=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const activityLib=fs.readFileSync(new URL('../lib/activity.js',import.meta.url),'utf8');
const activityBrowserWorkflow=fs.readFileSync(new URL('../.github/workflows/activity-center-browser-smoke.yml',import.meta.url),'utf8');
const activityProductionWorkflow=fs.readFileSync(new URL('../.github/workflows/activity-center-production-smoke.yml',import.meta.url),'utf8');

assert.match(shell,/site-shell-idle\.js/,'critical shell must schedule deferred shared features');
assert.match(idle,/header-live\[href\*="sooplive\.com"\]/,'SOOP header shortcut removal must remain in deferred bootstrap');
assert.match(idle,/activity-center\.css/,'activity center styles must remain available');
assert.match(idle,/activity-center\.js/,'activity center runtime must remain available');
assert.match(idle,/schedule\(\(\)=>/,'activity center should not compete with first paint');
assert.match(activityJs,/chunbong-activity-seen-v1/,'read state must use a stable localStorage key');
assert.match(activityJs,/type=activity/,'bell must load the unified activity API');
assert.match(activityJs,/activity-unread-dot/,'unread indicator must exist');
assert.match(activityJs,/markCurrentSeen/,'opening the bell must mark current items seen');
assert.match(activityJs,/data-activity-filter/,'activity categories must be filterable');
assert.match(activityJs,/CATEGORY_META/,'activity center must normalize content categories');
for(const icon of ['◷','!','▶','⚡','▷','✦']) assert.ok(activityJs.includes("icon:'"+icon+"'"),'activity category icon missing: '+icon);
assert.match(activityJs,/data-kind=/,'activity rows must expose shared category kinds');
assert.match(activityCss,/var\(--accent-schedule\)/);assert.match(activityCss,/var\(--accent-clips\)/);
assert.match(activityJs,/data-activity-filter="schedule"/);assert.match(activityJs,/aria-controls="activity-list"/);
for(const key of ['ArrowRight','ArrowLeft','Home','End'])assert.match(activityJs,new RegExp("event\\.key === '"+key+"'"),'activity tabs missing '+key);
assert.match(activityLib,/fetchSchedule/);assert.match(activityLib,/selectActivitySchedule/);
assert.match(activityJs,/document\.body\.append\(panel\)/);assert.match(activityJs,/!panel\.contains\(event\.target\)/);
assert.match(activityCss,/\.activity-panel\{/);assert.match(activityCss,/grid-template-columns:repeat\(5,1fr\)/);assert.match(activityCss,/data-kind="schedule"/);assert.match(activityCss,/\[data-theme="light"\] \.activity-panel/);assert.match(activityCss,/@media\(max-width:760px\)/);assert.match(activityCss,/\.activity-panel\{position:fixed;top:76px;left:8px;right:8px;bottom:8px;/);
assert.match(apiContent,/type==='activity'/);assert.match(pageJs,/requestedOpenId/);assert.match(pageJs,/requestedKind/);
assert.match(activityBrowserWorkflow,/changelog-data\.js/);
assert.doesNotMatch(activityBrowserWorkflow,/latest changelog date must render first'\);\s*assert\.equal[\s\S]*2026-09-19/);
assert.doesNotMatch(activityProductionWorkflow,/production changelog latest date is not first[\s\S]*2026-09-19/);
assert.match(activityProductionWorkflow,/sort\(\(a,b\)=>b\.localeCompare\(a\)\)/);
assert.match(activityProductionWorkflow,/팬사이트 사용성 개선: 홈·타로·데이터 간소화/);

const htmlFiles=fs.readdirSync(new URL('..',import.meta.url)).filter(name=>name.endsWith('.html'));
for(const name of htmlFiles){const html=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');if(!html.includes('class="site-header"'))continue;assert.match(html,/site-shell\.js/,'shared header page '+name+' must load site-shell.js so deferred activity bootstrap appears')}
console.log('activity notification center regression passed');