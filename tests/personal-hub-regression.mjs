import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const hub=read('personal-hub.js');
const hubCss=read('personal-hub.css');
const myhub=read('myhub.html');
const timeline=read('timeline.html');
const timelineJs=read('timeline.js');
const index=read('index.html');
const shell=read('site-shell.js');
const mobile=read('mobile-site.js');
const media=read('page-media.js');
const fanart=read('page-fanart.js');
const tarot=read('tarot.js');
const minigames=read('minigames.html');
const minProfile=read('minigame-profile.js');
const sw=read('service-worker.js');
const api=read('api/content.js');

for(const [name,source] of [['personal-hub.js',hub],['timeline.js',timelineJs]]){
  assert.doesNotThrow(()=>new Function(source),name+' must remain valid JavaScript');
}

assert.match(hub,/chunbong-personal-hub-v1/,'personal storage namespace missing');
assert.match(hub,/favorites:\[\]/,'favorites store missing');
assert.match(hub,/recent:null/,'continue-watching store missing');
assert.match(hub,/tarot:\[\]/,'tarot journal store missing');
assert.match(hub,/games:\{plays:/,'minigame play history missing');
assert.match(hub,/alerts:\{enabled:false/,'broadcast reminder preference missing');
assert.match(hub,/lastLiveBroadcastId/,'live broadcast dedupe state missing');
assert.match(hub,/function favoriteItem/);
assert.match(hub,/function recordRecent/);
assert.match(hub,/function recordTarot/);
assert.match(hub,/function recordGameStart/);
assert.match(hub,/function gameSnapshot/);
assert.match(hub,/function dailyChallenge/);
assert.match(hub,/Notification\.requestPermission/,'broadcast reminder must ask permission only after opt-in');
assert.match(hub,/else if\(permission!=='granted'\)enabled=false/,'blocked browser notification permission must keep the alert preference OFF');
assert.match(hub,/\/api\/content\?type=schedule/,'broadcast reminder must use the live schedule');
assert.match(hub,/\/api\/content\?type=live/,'broadcast reminder must also monitor actual SOOP live state');
assert.match(hub,/춘봉 방송이 시작됐어요/,'actual live-start notification copy missing');
assert.match(api,/type==='live'/,'content API must expose lightweight live state');
assert.match(api,/fetchSoopStructuredLive/,'live endpoint must reuse the structured SOOP live-state fetcher');
assert.match(hub,/now>=at-5\*60000&&now<=at\+15\*60000/,'schedule reminder window missing');
assert.doesNotMatch(hub,/fetch\([^)]*(favorite|tarot|personal|profile)/i,'personal records must not be uploaded to a server');

assert.match(myhub,/data-personal-dashboard/,'My Fan Hub dashboard root missing');
assert.match(myhub,/현재 브라우저의 로컬 저장소/,'local-only privacy explanation missing');
assert.match(hub,/내 보관함/);
assert.match(hub,/이어보기/);
assert.match(hub,/타로 기록장/);
assert.match(hub,/미니게임 업적/);
assert.match(hub,/방송 알림/,'combined LIVE and scheduled broadcast alert UI missing');
assert.match(hub,/오늘의 도전/);

assert.match(media,/chunbong:media-selected/,'media selection event missing');
assert.match(media,/__CHUNBONG_CURRENT_MEDIA__/,'late-loaded personal runtime media handoff missing');
assert.match(fanart,/chunbong:fanart-selected/,'fanart favorite event missing');
assert.match(tarot,/chunbong:tarot-reading/,'tarot journal event missing');
assert.match(hub,/timeupdate/,'native video progress persistence missing');
assert.match(hub,/progress:/,'continue-watching progress field missing');

assert.match(minigames,/data-profile-total-plays/,'minigame total play stat missing');
assert.match(minigames,/data-profile-achievements/,'minigame achievement count missing');
assert.match(minigames,/data-profile-recent/,'recent minigame stat missing');
assert.match(minigames,/data-profile-achievement-list/,'achievement badge strip missing');
assert.match(minProfile,/ChunbongPersonal\?\.gameSnapshot/,'unified profile must read personal game snapshot');
for(const achievement of ['첫 발자국','게임 단골','4종 탐험가','블록 러너','합체 장인','합계 10 장인','컬러 마스터']){
  assert.ok(hub.includes(achievement),'achievement missing: '+achievement);
}

assert.match(index,/data-app-home-panel/,'installed-app home panel missing');
assert.match(index,/href="myhub\.html"/,'home My Hub shortcut missing');
assert.match(index,/href="timeline\.html"/,'home timeline shortcut missing');
assert.match(hubCss,/\.pwa-app-mode \.app-home-panel\{display:block/,'app-only personalized home rule missing');
assert.match(mobile,/data-more-page="myhub"/,'mobile app More menu missing My Hub');
assert.match(mobile,/data-more-page="timeline"/,'mobile app More menu missing timeline');

assert.match(timeline,/data-chunbong-timeline/,'timeline root missing');
assert.match(timelineJs,/2020-07-03/,'first broadcast milestone missing');
assert.match(timelineJs,/2023-11-30/,'SOOP first broadcast milestone missing');
assert.match(timelineJs,/2026-08-30/,'fan site launch milestone missing');
assert.match(timelineJs,/CHUNBONG_CHANGELOG/,'timeline must extend from curated fan-site milestones');

assert.match(shell,/personal-hub\.css/,'shared shell must load personal hub styles');
assert.match(shell,/personal-hub\.js/,'shared shell must load personal hub runtime');
assert.match(sw,/chunbong-pwa-20260920-v17/,'personal hub release must advance PWA cache');
for(const asset of ['/personal-hub.css','/personal-hub.js','/myhub.html','/timeline.html','/timeline.css','/timeline.js']){
  assert.ok(sw.includes("'"+asset+"'"),'PWA app shell missing '+asset);
}
assert.match(sw,/notificationclick/,'notification click routing missing');


const homeOverview=read('home-overview.js');
assert.match(homeOverview,/get\('live'\)/,'home overview must query actual SOOP LIVE state');
assert.match(homeOverview,/LIVE NOW/,'home overview must prioritize actual SOOP LIVE state');

console.log('personal fan hub regression passed');
