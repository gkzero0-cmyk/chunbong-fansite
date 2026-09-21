import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

const content=read('api/content.js');
const auth=read('lib/operator-auth-api.js');
const analyticsApi=read('lib/site-analytics-api.js');
const feedbackApi=read('lib/feedback-api.js');
const dashboardApi=read('lib/operator-dashboard-api.js');
const analyticsClient=read('site-analytics.js');
const feedbackClient=read('feedback-widget.js');
const operatorHtml=read('operator.html');
const operatorJs=read('operator.js');
const operatorCss=read('operator.css');
const shell=read('site-shell.js');
const sw=read('service-worker.js');

assert.match(auth,/OWNER_GITHUB_ID\s*=\s*['"]322299248['"]/,'owner GitHub numeric id must be pinned');
assert.match(auth,/OWNER_GITHUB_LOGIN\s*=\s*['"]gkzero0-cmyk['"]/,'owner GitHub display login missing');
assert.match(auth,/0c640d100529df1d326a494f9de2a8255e3e860fc33e0260bdda5f08d280e945/,'owner email hash missing');
assert.doesNotMatch(auth,/gkzero0@gmail\.com/,'owner email must not be committed in plaintext');
assert.match(auth,/90\s*\*\s*24\s*\*\s*60\s*\*\s*60/,'operator session must last 90 days');
assert.match(auth,/HttpOnly/i);
assert.match(auth,/Secure/i);
assert.match(auth,/SameSite=Lax/i);
assert.match(auth,/github\.com\/login\/oauth\/authorize/,'GitHub OAuth start missing');
assert.match(auth,/github\.com\/login\/oauth\/access_token/,'GitHub OAuth exchange missing');
assert.match(auth,/identitytoolkit\.googleapis\.com/,'Firebase email-link exchange missing');
assert.match(auth,/FIREBASE_WEB_API_KEY/,'Firebase API key must stay server-configured');
assert.match(auth,/GITHUB_OAUTH_CLIENT_SECRET/,'GitHub client secret must stay server-configured');

for(const type of ['analytics-event','feedback','operator-auth','operator-dashboard','operator-feedback']){
  assert.match(content,new RegExp("type==='"+type+"'"),'content API route missing '+type);
}

for(const event of ['page_view','active_time','menu_click','feature_click']){
  assert.ok(analyticsApi.includes(event),'analytics event missing '+event);
}
assert.match(analyticsApi,/analytics:active:v1/,'active-user index missing');
assert.match(analyticsApi,/analytics:visitors:v1/,'daily unique visitor set missing');
assert.match(analyticsApi,/analytics:sessions:v1/,'daily session set missing');
assert.doesNotMatch(analyticsApi,/EXPIRE[^\n]*analytics:day:v1|RETENTION_SECONDS=400/,'aggregate analytics must not expire on a short retention window');
assert.match(analyticsApi,/SESSION_RETENTION_SECONDS=45\*24\*60\*60/,'only raw recent session detail should use bounded retention');
assert.doesNotMatch(analyticsApi,/x-forwarded-for|remoteAddress|clientIp|ipAddress/i,'analytics must not persist IP addresses');

for(const token of ['visibilityState','location.pathname','navigator.sendBeacon','chunbong-analytics-id-v1']){
  assert.ok(analyticsClient.includes(token),'analytics client missing '+token);
}
assert.doesNotMatch(analyticsClient,/location\.search/,'analytics must not collect query strings');

for(const category of ['bug','inconvenience','feature','design','content','other']){
  assert.ok(feedbackApi.includes(category),'feedback category missing '+category);
}
for(const status of ['new','reviewing','planned','done']){
  assert.ok(feedbackApi.includes(status),'feedback status missing '+status);
}
assert.match(feedbackApi,/FB-/,'human-readable feedback id missing');
assert.match(feedbackApi,/nickname/,'optional nickname missing');

assert.match(feedbackClient,/닉네임 \(선택\)/,'feedback optional nickname UI missing');
assert.match(feedbackClient,/입력하지 않으면 익명/,'anonymous helper copy missing');
assert.match(feedbackClient,/건의 · 피드백/,'feedback launcher missing');

for(const label of ['오늘 방문자','현재 활성','평균 체류시간','페이지뷰','인기 메뉴','기기','피드백']){
  assert.ok(operatorHtml.includes(label)||operatorJs.includes(label),'operator UI missing '+label);
}
assert.match(operatorHtml,/GitHub로 운영자 인증/);
assert.match(operatorHtml,/이메일로 운영자 인증/);
assert.match(operatorJs,/operator-dashboard/);
assert.match(operatorJs,/operator-feedback/);
assert.match(operatorCss,/operator-dashboard/);

assert.match(dashboardApi,/requireOperator/,'operator dashboard must require server-side authentication');
assert.match(feedbackApi,/requireOperator/,'operator feedback reads must require server-side authentication');
assert.match(shell,/site-analytics\.js/,'shared shell must load analytics');
assert.match(shell,/feedback-widget\.js/,'shared shell must load feedback widget');
assert.match(sw,/chunbong-pwa-20260921-v27/,'PWA cache must advance for analytics and feedback runtime');

console.log('operator center, private analytics and feedback regression passed');
