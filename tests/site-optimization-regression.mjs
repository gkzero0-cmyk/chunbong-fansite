import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('site-shell.js');
const improvements=read('site-improvements.js');
const sw=read('service-worker.js');
const feedback=read('feedback-widget.js');
const mobile=read('mobile-site.css');
const operatorHtml=read('operator.html');
const operatorJs=read('operator.js');
const operatorCss=read('operator.css');

assert.match(shell,/personalPriorityPages/,'shared personal runtime should be prioritized only on pages that need it immediately');
assert.match(shell,/runIdle\(loadPersonal\)/,'non-critical personal hub runtime should defer to idle time');
assert.match(shell,/runIdle\(\(\)=>loadScript\('site-meta\.js'\)\)/,'site metadata enhancement should defer to idle time');
assert.match(improvements,/requestIdleCallback/,'optional analytics and feedback should defer until browser idle time');
assert.match(improvements,/loadScript\('site-analytics\.js'\)/);
assert.match(improvements,/loadScript\('feedback-widget\.js'\)/);

assert.match(sw,/chunbong-pwa-20260922-v29/,'optimized PWA cache version missing');
for(const heavy of ['/tarot.js','/data.js','/myhub.html','/site-analytics.js','/feedback-widget.js']){
  assert.ok(!sw.includes(heavy),'heavy/optional runtime must not block PWA installation: '+heavy);
}
for(const core of ['/site-shell.js','/mobile-site.js','/personal-hub.js','/assets/chunbong-main.webp']){
  assert.ok(sw.includes(core),'core PWA shell asset missing: '+core);
}

assert.match(feedback,/classList\.add\('feedback-open'\)/,'feedback dialog must expose overlay state');
assert.match(feedback,/classList\.remove\('feedback-open'\)/,'feedback dialog must clear overlay state');
assert.match(mobile,/Mobile overlay coordination/,'mobile overlay coordination layer missing');
assert.match(mobile,/\.pwa-app-more-open,\.feedback-open/,'mobile modal states must suppress competing floating UI');

assert.match(operatorHtml,/class="skip-link"/,'operator skip link missing');
assert.match(operatorHtml,/role="tablist"/,'operator tablist semantics missing');
assert.match(operatorHtml,/role="tabpanel"/,'operator tabpanel semantics missing');
assert.match(operatorHtml,/operator-overall-status/,'operator overall status summary missing');
assert.match(operatorJs,/renderOverallStatus/,'operator overall status runtime missing');
assert.match(operatorJs,/Promise\.allSettled/,'operator health request must not break authenticated dashboard');
assert.match(operatorCss,/operator-overall-badges/,'operator status badge styles missing');
assert.match(operatorCss,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'operator mobile tabs/period must fit without scrolling');

const protectedAssets=[
  ['assets/chunbong-main.webp',30000],
  ['assets/clips-hero-banner.jpg',120000],
  ['assets/data-hero-banner.jpg',180000],
  ['assets/fanart-hero-banner.jpg',150000],
  ['assets/history-hero-banner.jpg',400000],
  ['assets/notice-hero-banner.jpg',130000],
  ['assets/schedule-hero-banner.jpg',120000],
  ['assets/vod-hero-banner.jpg',120000],
  ['assets/youtube-hero-banner.jpg',140000],
  ['assets/minigames-hero-hq.webp',60000]
];
for(const [file,minBytes] of protectedAssets){
  const size=fs.statSync(new URL('../'+file,import.meta.url)).size;
  assert.ok(size>=minBytes,file+' appears to have been aggressively recompressed: '+size+' bytes');
}
for(let i=1;i<=11;i++){
  const size=fs.statSync(new URL('../assets/chunbak/'+i+'.webp',import.meta.url)).size;
  assert.ok(size>=300000,'assets/chunbak/'+i+'.webp quality guard failed: '+size+' bytes');
}
const index=read('index.html');
assert.match(index,/src="assets\/chunbong-main\.webp"/,'home hero must keep the original local image asset');
assert.doesNotMatch(index,/\/api\/image\?[^"' ]*(?:width|w)=/i,'home hero must not be routed through a forced low-resolution image proxy');

new Function(shell);
new Function(improvements);
new Function(feedback);
new Function(operatorJs);

console.log('site optimization and image quality preservation regression passed');
