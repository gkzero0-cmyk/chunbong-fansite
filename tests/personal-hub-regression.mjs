import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const hub=read('personal-hub.js');
const hubCss=read('personal-hub.css');
const myhub=read('myhub.html');
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

assert.doesNotThrow(()=>new Function(hub),'personal-hub.js must remain valid JavaScript');

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
assert.match(hub,/state\.alerts\.enabled=true;state\.alerts\.pushEnabled=false;write\(state\);/,'alert toggle must persist ON immediately after permission grant');
assert.match(hub,/void syncPushSubscription\(true,state\)\.then/,'background push setup must not block the ON toggle');
assert.match(hub,/state\.alerts\.enabled=false;state\.alerts\.pushEnabled=false;write\(state\);[\s\S]*void syncPushSubscription\(false,state\)/,'OFF toggle must persist before background unsubscribe');
assert.match(hub,/브라우저 알림 권한 차단됨 · 설정에서 허용 필요/,'blocked notification permission must show actionable UI copy');
assert.match(hub,/aria-busy/,'alert toggle must show immediate busy feedback');
assert.match(hub,/ALERT_PERMISSION_RECOVERY_KEY/,'blocked permission recovery state missing');
assert.match(hub,/function showAlertPermissionHelp\(\)/,'blocked permission help dialog missing');
assert.match(hub,/function recheckAlertPermission\(/,'permission recheck flow missing');
assert.match(hub,/data-alert-permission-recheck/,'permission recovery dialog must expose a recheck action');
assert.match(hub,/window\.addEventListener\('focus',handlePermissionReturn\)/,'returning from browser or OS settings must recheck notification permission');
assert.match(hub,/브라우저 보안 정책상 팬사이트가 차단된 권한을 직접 해제할 수는 없습니다/,'permission dialog must explain the browser security boundary');
assert.match(hub,/data-alert-permission-help/,'blocked alert card must expose permission instructions directly');
assert.match(hub,/async function ensurePushServiceWorker\(\)/,'push alerts must ensure a service worker instead of depending on page load timing');
assert.match(hub,/navigator\.serviceWorker\.register\('\/service-worker\.js'/,'push alerts must be able to register the service worker directly');
assert.match(hub,/data-personal-push-retry/,'failed background push setup must expose a retry action');
assert.match(hub,/알림 ON · 백그라운드 Push 연결 중\/확인 필요/,'background push setup state must be visible to the user');
assert.match(hub,/if\(permission!=='granted'\)\{[\s\S]*state\.alerts\.enabled=false;state\.alerts\.pushEnabled=false;write\(state\);[\s\S]*return false;/,'blocked browser notification permission must keep the alert preference OFF');
assert.match(hub,/function alertPermissionGranted\(\)/,'runtime notification permission guard missing');
assert.match(hub,/function disableUnavailableAlerts\(state\)/,'revoked notification permission must disable persisted alerts');
assert.equal((hub.match(/if\(disableUnavailableAlerts\(state\)\)return;/g)||[]).length,2,'both live and schedule checks must stop after notification permission is revoked');
assert.match(hub,/\/api\/content\?type=schedule/,'broadcast reminder must use the live schedule');
assert.match(hub,/\/api\/content\?type=live/,'broadcast reminder must also monitor actual SOOP live state');
assert.match(hub,/춘봉 방송이 시작됐어요/,'actual live-start notification copy missing');
assert.match(hub,/async function deliverNotification\(title,options\)/,'notification delivery helper missing');
assert.match(hub,/if\(!delivered\)return;[\s\S]*lastLiveBroadcastId=broadcastId/,'failed LIVE notifications must not be marked as delivered');
assert.match(hub,/if\(!\(await showReminder\(target\)\)\)return;[\s\S]*lastNotified=key/,'failed schedule notifications must remain retryable');
assert.match(api,/type==='live'/,'content API must expose lightweight live state');
assert.match(api,/source:String\(state\.source\|\|'soop-live'\)/,'live endpoint should report the actual fallback source');
assert.match(api,/fetchSoopLive/,'live endpoint must reuse the shared SOOP live-state fetcher');
assert.match(hub,/now>=at-lead\*60000&&now<=at\+15\*60000/,'schedule reminder window missing');
assert.doesNotMatch(hub,/fetch\([^)]*(favorite|tarot|personal|profile)/i,'personal records must not be uploaded to a server');

assert.match(myhub,/data-personal-dashboard/,'My Fan Hub dashboard root missing');
assert.match(myhub,/현재 브라우저의 로컬 저장소/,'local-only privacy explanation missing');
assert.match(hub,/function personalCategoryKind\(/,'My Hub saved content must normalize category identity');
assert.match(hub,/data-kind=/,'My Hub saved content must expose shared category kinds');
assert.match(hubCss,/var\(--category-accent\)/,'My Hub category labels must use shared category accents');
assert.match(hubCss,/\.personal-alert-permission-dialog/,'blocked notification recovery dialog styles missing');
assert.match(hubCss,/@media\(max-width:760px\)[\s\S]*personal-alert-permission-dialog/,'permission dialog must fit mobile screens');
assert.match(hub,/내 보관함/);
assert.match(hub,/이어보기/);
assert.match(hub,/타로 기록장/);
assert.match(hub,/미니게임 업적/);
assert.match(hub,/방송 알림/,'combined LIVE and scheduled broadcast alert UI missing');
assert.match(hub,/오늘의 도전/);

assert.match(media,/chunbong:media-selected/,'media selection event missing');
assert.match(media,/__CHUNBONG_CURRENT_MEDIA__/,'late-loaded personal runtime media handoff missing');
assert.match(media,/const itemKey=item=>String\(item\?\.id\|\|item\?\.videoId\|\|item\?\.link\|\|item\?\.title\|\|''\)/,'media favorites need a stable fallback key');
assert.match(media,/open='\+encodeURIComponent\(itemKey\(item\)\)/,'saved media reopen links must use the same stable key');
assert.match(fanart,/href:'fanart\.html\?open='\+encodeURIComponent\(itemKey\(item\)\)/,'saved fanart reopen links must preserve fallback keys');
assert.match(fanart,/items\.findIndex\(item => itemKey\(item\) === String\(requestedOpenId\)\)/,'fanart deep links must resolve the same fallback key');
assert.match(fanart,/chunbong:fanart-selected/,'fanart favorite event missing');
assert.match(tarot,/chunbong:tarot-reading/,'tarot journal event missing');
assert.match(hub,/timeupdate/,'native video progress persistence missing');
assert.match(hub,/window\.addEventListener\('pagehide',stopReminderTimer\)/,'background navigation must stop the reminder timer cleanly');
assert.match(hub,/window\.addEventListener\('pageshow',[\s\S]*startReminderTimer\(\)[\s\S]*checkBroadcastReminder\(\)[\s\S]*checkLiveReminder\(\)/,'bfcache return must restart LIVE and schedule monitoring');
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
assert.match(hubCss,/\.pwa-app-mode \.app-home-panel\{display:block/,'app-only personalized home rule missing');
assert.match(mobile,/data-more-page="myhub"/,'mobile app More menu missing My Hub');
assert.doesNotMatch(index,/timeline\\.html|춘봉 타임라인/,'retired timeline must not remain on home');
assert.doesNotMatch(myhub,/timeline\\.html|춘봉 타임라인/,'retired timeline must not remain in My Fan Hub');
assert.doesNotMatch(mobile,/data-more-page="timeline"|timeline\\.html/,'retired timeline must not remain in mobile More menu');
for(const asset of ['/timeline.html','/timeline.css','/timeline.js']) assert.ok(!sw.includes("'"+asset+"'"),'retired timeline must not remain in PWA app shell: '+asset);

assert.match(shell,/personal-hub\.css/,'shared shell must load personal hub styles');
assert.match(shell,/personal-hub\.js/,'shared shell must load personal hub runtime');
for(const asset of ['/personal-hub.css','/personal-hub.js']){
  assert.ok(!sw.includes("'"+asset+"'"),'personal hub should runtime-cache after first use instead of blocking PWA install: '+asset);
}
assert.ok(!sw.includes("'/myhub.html'"),'My Fan Hub page should runtime-cache after first visit instead of bloating initial PWA install');
assert.match(sw,/chunbong-pwa-/,'lightweight PWA shell change must refresh the cache');
assert.match(sw,/notificationclick/,'notification click routing missing');


const homeOverview=read('home-overview.js');
assert.match(homeOverview,/get\('live'\)/,'home overview must query actual SOOP LIVE state');
assert.match(homeOverview,/LIVE NOW/,'home overview must prioritize actual SOOP LIVE state');

assert.match(hub,/COLLECTIONS=Object\.freeze/,'saved-content collections missing');
assert.match(hub,/setFavoriteCollection/,'saved-content collection assignment missing');
assert.match(hub,/toggleTarotPinned/,'tarot favorites missing');
assert.match(hub,/leadMinutes:10/,'default scheduled alert lead missing');
assert.match(hub,/ALERT_TYPE_LABELS/,'alert content-type preferences missing');
assert.match(hub,/classifyScheduleItem/,'schedule alert classifier missing');
assert.match(hub,/daily:\{\}/,'daily minigame history missing');
assert.match(hub,/3일 연속 출석/,'three-day daily streak achievement missing');
assert.match(hub,/일주일 도전자/,'seven-day daily streak achievement missing');
console.log('personal fan hub regression passed');
