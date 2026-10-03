import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('site-shell.js');
const idle=read('site-shell-idle.js');
const content=read('content.js');
const serviceWorker=read('service-worker.js');
const shellPages=['index.html','schedule.html','notice.html','vod.html','clips.html','youtube.html','fanart.html','tarot.html','history.html','data.html','minigames.html','changelog.html'];
const contentPages=['index.html','schedule.html','notice.html','vod.html','clips.html','youtube.html','fanart.html','tarot.html','history.html','data.html'];
const leanPages=['minigames.html','changelog.html'];
const gamePages=['chuntris.html','chunbak.html','chungwagame.html','chuncortile.html'];

for(const token of ['ChunbongCache','nav-group','theme-toggle','changelog-button','nav-minigames-submenu','site-shell-idle.js'])assert.ok(shell.includes(token),'shared shell missing '+token);
for(const token of ['activity-center.js','site-health.js','site-improvements.js','site-meta.js','personal-hub.js','ChunbongNavigationPrefetch'])assert.ok(idle.includes(token),'idle shell missing '+token);
assert.ok(!shell.includes('window.CHUNBONG_CONTENT ='),'shared shell must not carry general content data');
assert.ok(content.includes('window.CHUNBONG_CONTENT ='),'content bundle must keep general content data');
assert.ok(content.includes('fanart-gallery.js'),'content bundle must keep fanart-specific runtime');
assert.ok(!content.includes('ChunbongCache'),'content bundle must not duplicate shared cache');
assert.ok(!content.includes('activity-center.js'),'content bundle must not duplicate shared activity runtime');
assert.ok(!content.includes('theme-toggle'),'content bundle must not duplicate shared theme controls');

for(const file of shellPages){const html=read(file),shellAt=html.search(/src="site-shell\.js(?:\?v=\d+)?"/),pageAt=html.search(/src="page\.js(?:\?v=\d+)?/);assert.ok(shellAt>=0,file+' missing site-shell.js');assert.ok(pageAt>shellAt,file+' must keep common page runtime after shared shell')}
for(const file of contentPages){const html=read(file),shellAt=html.search(/src="site-shell\.js(?:\?v=\d+)?"/),contentAt=html.search(/src="content\.js(?:\?v=\d+)?"/);assert.ok(contentAt>shellAt,file+' must load content.js after site-shell.js')}
for(const file of leanPages)assert.doesNotMatch(read(file),/src="content\.js(?:\?[^\"]*)?"/,file+' must not load the general content bundle');
for(const file of gamePages){const html=read(file),shellAt=html.indexOf('src="site-shell.js"'),pageAt=html.search(/src="page\.js(?:\?v=\d+)?/);assert.ok(shellAt>=0,file+' missing shared shell');assert.doesNotMatch(html,/src="content\.js"/,file+' must not load general content data');assert.ok(pageAt>shellAt,file+' must keep common page runtime after shared shell')}

assert.match(serviceWorker,/\/site-shell\.js/,'offline app shell must include site-shell.js');
assert.match(serviceWorker,/const CACHE_NAME = CACHE_PREFIX \+ BUILD_VERSION/,'PWA cache version must follow the deployed build');
assert.match(idle,/\['home','myhub','tarot'\]/,'personal hub runtime should retain interactive-page priority');
assert.match(idle,/schedule\(loadPersonal/,'personal runtime must remain deferred');
assert.match(idle,/site-meta\.js/,'site metadata enhancement must remain available in idle shell');
assert.match(idle,/site-improvements\.js\?v=2/,'site improvements must remain available in idle shell');
assert.match(idle,/activity-center\.js/,'activity center must remain available in idle shell');
assert.ok(shell.length<14000,'shared critical shell unexpectedly large');
assert.ok(idle.length<8500,'idle shell unexpectedly large');
assert.ok(content.length<6500,'content data bundle unexpectedly large');
console.log('site shell split regression passed');
