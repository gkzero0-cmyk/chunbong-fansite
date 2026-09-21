import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

const api=read('lib/operator-center-api.js');
const content=read('api/content.js');
const operatorHtml=read('operator.html');
const operatorJs=read('operator.js');
const operatorCss=read('operator.css');
const analytics=read('site-analytics.js');
const feedback=read('feedback-widget.js');
const feedbackCss=read('feedback-widget.css');
const improvements=read('site-improvements.js');
const mobile=read('mobile-site.js');
const sw=read('service-worker.js');
const vercel=read('vercel.json');
const robots=read('robots.txt');

assert.match(api,/OWNER_GITHUB_ID\s*=\s*322299248/,'owner GitHub numeric id missing');
assert.match(api,/OWNER_GITHUB_LOGIN\s*=\s*'gkzero0-cmyk'/,'owner GitHub login missing');
assert.match(api,/OWNER_EMAIL_SHA256\s*=\s*'0c640d100529df1d326a494f9de2a8255e3e860fc33e0260bdda5f08d280e945'/,'owner email hash missing');
assert.doesNotMatch(api,/gkzero0@gmail\.com/i,'owner email must not be stored in plaintext in repository');
assert.match(api,/OPERATOR_GITHUB_CLIENT_ID/);
assert.match(api,/OPERATOR_GITHUB_CLIENT_SECRET/);
assert.match(api,/FIREBASE_API_KEY/);
assert.match(api,/FIREBASE_PROJECT_ID/);
assert.match(api,/HttpOnly/);
assert.match(api,/SameSite=Lax/);
assert.match(api,/Max-Age=7776000/,'90-day operator session missing');
assert.match(api,/timingSafeEqual/,'signed session verification missing');
assert.match(api,/github\.com\/login\/oauth\/authorize/,'GitHub OAuth start missing');
assert.match(api,/GITHUB_PKCE_PREFIX/,'GitHub PKCE storage missing');
assert.match(api,/code_challenge_method','S256'/,'GitHub PKCE challenge missing');
assert.match(api,/code_verifier:verifier/,'GitHub PKCE verifier missing');
assert.match(api,/AUTH_EPOCH_KEY/,'operator session revocation epoch missing');
assert.match(api,/SESSION_INDEX/,'operator active session index missing');
assert.match(api,/set\('scope','read:user'\)/,'GitHub OAuth must request only the minimum profile scope');
assert.doesNotMatch(api,/read:user user:email/,'GitHub OAuth must not request email scope');
assert.match(api,/api\.github\.com\/user/,'GitHub identity verification missing');
assert.match(api,/accounts:lookup/,'Firebase ID token lookup missing');
assert.match(api,/sha256/,'owner email comparison must use hash');
assert.match(api,/operator:session-secret:v1/,'server-managed session secret missing');
assert.match(api,/operator:analytics:start:v1/,'analytics collection start marker missing');
assert.match(api,/ACTIVE_KEY='operator:analytics:active:v1'/,'active visitor key missing');
assert.match(api,/\['ZADD',ACTIVE_KEY/,'active visitor tracking missing');
assert.match(api,/PFADD/,'anonymous unique visitor aggregation missing');
assert.match(api,/feedback:[\s\S]*nickname/,'feedback storage missing optional nickname');
assert.match(api,/origin_not_allowed/,'same-origin write guard missing');
assert.match(api,/rate_limited/,'feedback rate limit missing');
assert.match(api,/No raw IP|raw IP/i,'privacy guard comment missing');

for(const type of [
  'site-analytics-event','feedback-submit','operator-auth-config','operator-session',
  'operator-github-start','operator-github-callback','operator-email-complete',
  'operator-analytics','operator-feedback','operator-feedback-update','operator-logout','operator-logout-all'
]) assert.ok(content.includes(type),'api/content missing '+type);
assert.match(content,/operatorCenter=require\('\.\.\/lib\/operator-center-api'\)/);

assert.match(operatorHtml,/data-page="operator"/);
assert.match(operatorHtml,/GitHub로 인증/);
assert.match(operatorHtml,/이메일로 인증/);
assert.match(operatorHtml,/개요/);
assert.match(operatorHtml,/피드백/);
assert.match(operatorHtml,/보안/);
assert.match(operatorHtml,/operator\.css/);
assert.match(operatorHtml,/type="module" src="operator\.js"/);

assert.match(operatorJs,/operator-auth-config/);
assert.match(operatorJs,/operator-session/);
assert.match(operatorJs,/operator-analytics/);
assert.match(operatorJs,/operator-feedback/);
assert.match(api,/accounts:sendOobCode/,'Firebase email link dispatch missing');
assert.match(api,/operator:auth:email-cooldown:v1/,'operator email magic-link cooldown missing');
assert.match(operatorJs,/signInWithEmailLink/,'Firebase email link completion missing');
assert.doesNotMatch(operatorJs,/eligible/,'operator email registration state must not be exposed to the client');
assert.match(operatorHtml,/90일/);
assert.match(operatorCss,/operator-dashboard/);
assert.match(operatorCss,/operator-metric-grid/);

assert.match(analytics,/crypto\.randomUUID/,'anonymous browser id missing');
assert.match(analytics,/sessionStorage/,'session identifier missing');
assert.match(analytics,/visibilitychange/,'active time visibility tracking missing');
assert.match(analytics,/page_view/);
assert.match(analytics,/menu_click/);
assert.match(analytics,/game_start/);
assert.match(analytics,/tarot_start/);
assert.match(analytics,/navigator\.doNotTrack/,'DNT guard missing');
assert.doesNotMatch(analytics,/email|nickname/i,'analytics client must not collect identity fields');

assert.match(feedback,/닉네임 \(선택\)/);
assert.match(feedback,/입력하지 않으면 익명/);
assert.match(feedback,/버그 신고/);
assert.match(feedback,/기능 제안/);
assert.match(feedback,/feedback-submit/);
assert.match(feedback,/data-feedback-open/);
assert.match(feedbackCss,/feedback-dialog/);

assert.match(improvements,/site-analytics\.js/,'sitewide analytics runtime not loaded');
assert.match(improvements,/feedback-widget\.js/,'sitewide feedback runtime not loaded');
assert.match(mobile,/data-feedback-open/,'mobile More feedback entry missing');

assert.match(sw,/chunbong-pwa-20260921-v27/,'PWA cache must advance for operator center');
for(const asset of ['/site-analytics.js','/feedback-widget.js','/feedback-widget.css']) assert.ok(sw.includes(asset),'PWA shell missing '+asset);

new Function(api);
new Function(analytics);
new Function(feedback);

console.log('operator center analytics, feedback and auth regression passed');

const vercelConfig=JSON.parse(vercel);
assert.ok((vercelConfig.rewrites||[]).some(row=>row.source==='/api/operator/github/start'),'clean GitHub auth start rewrite missing');
assert.ok((vercelConfig.rewrites||[]).some(row=>row.source==='/api/operator/github/callback'),'clean GitHub auth callback rewrite missing');
assert.match(operatorHtml,/\/api\/operator\/github\/start/,'operator login should use clean GitHub auth route');
assert.match(operatorHtml,/operator-logout-all/,'all-device logout control missing');
assert.match(operatorJs,/operator-logout-all/,'all-device logout runtime missing');
assert.match(operatorJs,/security-sessions/,'active operator session count missing');
assert.match(robots,/Disallow: \/operator\.html/,'operator page should be excluded from crawlers');
