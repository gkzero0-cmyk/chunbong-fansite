import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const { buildActivityFeed, parsePublishedAt }=require('../lib/activity-feed.js');

const now=new Date('2026-09-18T09:30:00.000Z');
assert.equal(parsePublishedAt('2026-09-18 18:19:00',now).publishedAt,'2026-09-18T09:19:00.000Z');
assert.equal(parsePublishedAt(1789718400000,now).precision,'datetime');

const items=buildActivityFeed({
  notice:[{id:'9001',title:'휴방 공지 (세팅 이슈)',sortDate:'2026-09-18 18:19:00',link:'https://example.com/notice'}],
  fanart:[{id:'8001',title:'가을 팬아트',author:'팬작가',dateIso:'2026-09-18T08:10:00.000Z',link:'https://example.com/fanart'}],
  clips:{catch:[{id:'7001',title:'오늘의 CATCH',sortDate:'2026-09-18 16:00:00'}],clip:[]},
  vod:[],
  youtube:{
    videos:[{id:'abcdefghijk',title:'오늘의 영상',dateIso:'2026-09-18T06:00:00.000Z'}],
    shorts:[{id:'lmnopqrstuv',title:'오늘의 쇼츠',dateIso:'2026-09-18T10:00:00.000Z'}]
  }
},{now});

assert.equal(items[0].type,'shorts','newest item must sort first');
const notice=items.find(item=>item.type==='notice');
assert.equal(notice.title,'휴방 공지 (세팅 이슈)');
assert.equal(notice.href,'notice.html?open=9001');
assert.equal(notice.group,'notice');
assert.match(items.find(item=>item.type==='fanart').href,/fanart\.html\?open=8001/);
assert.match(items.find(item=>item.type==='shorts').href,/youtube\.html\?kind=shorts&open=lmnopqrstuv/);

const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
const activityJs=fs.readFileSync(new URL('../activity-center.js',import.meta.url),'utf8');
const activityCss=fs.readFileSync(new URL('../activity-center.css',import.meta.url),'utf8');
const pageJs=fs.readFileSync(new URL('../page.js',import.meta.url),'utf8');
const apiContent=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

assert.match(shell,/header-live\[href\*="sooplive\.com"\]/,'SOOP header shortcut must be removed at bootstrap');
assert.match(shell,/activity-center\.css/);
assert.match(shell,/activity-center\.js/);
assert.match(activityJs,/chunbong-activity-seen-v1/,'read state must use a stable localStorage key');
assert.match(activityJs,/type=activity/,'bell must load the unified activity API');
assert.match(activityJs,/activity-unread-dot/,'unread indicator must exist');
assert.match(activityJs,/markCurrentSeen/,'opening the bell must mark current items seen');
assert.match(activityJs,/data-activity-filter/,'activity categories must be filterable');
assert.match(activityJs,/document\.body\.append\(panel\)/,'mobile activity panel must escape the filtered sticky header containing block');
assert.match(activityJs,/!panel\.contains\(event\.target\)/,'outside-click handling must still treat the body-hosted panel as inside');
assert.match(activityCss,/\.activity-panel\{/);
assert.match(activityCss,/\[data-theme="light"\] \.activity-panel/,'notification panel needs light-mode styling');
assert.match(activityCss,/@media\(max-width:760px\)/,'notification panel needs mobile layout');
assert.match(activityCss,/\.activity-panel\{position:fixed;top:76px;left:8px;right:8px;bottom:8px;/,'mobile notification panel must be viewport-bounded');
assert.match(apiContent,/type==='activity'/,'content API must expose activity feed');
assert.match(pageJs,/requestedOpenId/,'content pages must understand activity deep links');
assert.match(pageJs,/requestedKind/,'video pages must understand activity kind deep links');

const htmlFiles=fs.readdirSync(new URL('..',import.meta.url)).filter(name=>name.endsWith('.html'));
for(const name of htmlFiles){
  const html=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
  if(!html.includes('class="site-header"')) continue;
  assert.match(html,/site-shell\.js/,'shared header page '+name+' must load site-shell.js so the bell appears');
}

console.log('activity notification center regression passed');
