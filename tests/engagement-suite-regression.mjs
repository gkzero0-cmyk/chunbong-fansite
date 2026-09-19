import assert from 'node:assert/strict';
import fs from 'node:fs';

const engagement=fs.readFileSync(new URL('../engagement-suite.js',import.meta.url),'utf8');
const engagementCss=fs.readFileSync(new URL('../engagement-suite.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
const media=fs.readFileSync(new URL('../page-media.js',import.meta.url),'utf8');
const timelineHtml=fs.readFileSync(new URL('../timeline.html',import.meta.url),'utf8');
const timelineJs=fs.readFileSync(new URL('../timeline.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const mobile=fs.readFileSync(new URL('../mobile-site.js',import.meta.url),'utf8');

assert.doesNotThrow(()=>new Function(engagement),'engagement suite must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(timelineJs),'timeline runtime must remain valid JavaScript');

assert.match(shell,/engagement-suite\.css/,'shared shell must load engagement suite styles');
assert.match(shell,/engagement-suite\.js/,'shared shell must load engagement suite runtime');
assert.match(shell,/!document\.body\?\.dataset\?\.game/,'game pages must stay isolated from general engagement runtime');

assert.match(engagement,/chunbong-personal-hub-v1/,'personal hub storage key missing');
assert.match(engagement,/favorites:Array\.isArray/,'favorites storage missing');
assert.match(engagement,/recents:Array\.isArray/,'continue-watching storage missing');
assert.match(engagement,/tarot:Array\.isArray/,'tarot journal storage missing');
assert.match(engagement,/data-personal-dashboard/,'today dashboard missing');
assert.match(engagement,/display-mode: standalone/,'installed app home detection missing');
assert.match(engagement,/MY CHUNBONG/,'personal hub drawer missing');
assert.match(engagement,/즐겨찾기 · 나중에 보기/,'watch-later section missing');
assert.match(engagement,/이어보기/,'continue-watching section missing');
assert.match(engagement,/타로 기록장/,'tarot journal missing');
assert.match(engagement,/ACHIEVEMENTS/,'minigame achievements missing');
assert.match(engagement,/Notification\.requestPermission/,'broadcast notification permission flow missing');
assert.match(engagement,/setInterval\(checkBroadcastAlert,60\*1000\)/,'broadcast alert check loop missing');
assert.match(engagement,/timeline\.html/,'timeline must be linked from personal hub');
assert.doesNotMatch(engagement,/랜덤 추억|random memory/i,'random memory feature must stay excluded');

assert.match(media,/chunbong:media-selected/,'media pages must publish exact selected content');
assert.match(media,/thumb:item\?\.thumb/,'continue watching should preserve thumbnails when available');

assert.match(timelineHtml,/data-page="timeline"/,'timeline page marker missing');
assert.match(timelineHtml,/data-timeline-filter="broadcast"/,'broadcast timeline filter missing');
assert.match(timelineHtml,/data-timeline-filter="site"/,'fan-site timeline filter missing');
assert.match(timelineJs,/type=data/,'timeline must include broadcast data');
assert.match(timelineJs,/CHUNBONG_CHANGELOG/,'timeline must include curated fan-site updates');

for(const asset of ['engagement-suite.css','engagement-suite.js','timeline.html','timeline.css','timeline.js']){
  assert.ok(sw.includes("'/"+asset+"'"),'PWA app shell missing '+asset);
}
assert.match(mobile,/data-more-page="timeline"/,'mobile installed-app more menu must include timeline');

assert.match(engagementCss,/\.personal-dashboard-grid/,'personalized app-home styles missing');
assert.match(engagementCss,/\.personal-hub-drawer/,'personal hub drawer styles missing');
assert.match(engagementCss,/\.tarot-journal-grid/,'tarot journal styles missing');
assert.match(engagementCss,/\.minigame-achievement/,'achievement styles missing');

console.log('engagement suite regression passed');