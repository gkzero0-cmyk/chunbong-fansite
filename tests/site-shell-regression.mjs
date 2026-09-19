import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const shell=read('site-shell.js');
const content=read('content.js');
const serviceWorker=read('service-worker.js');

const generalPages=[
  'index.html','schedule.html','notice.html','vod.html','clips.html','youtube.html',
  'fanart.html','tarot.html','history.html','data.html','minigames.html','changelog.html'
];
const gamePages=['chuntris.html','chunbak.html','chungwagame.html','chuncortile.html'];

for(const token of ['ChunbongCache','nav-group','theme-toggle','changelog-summary','activity-center.js','nav-minigames-submenu']){
  assert.ok(shell.includes(token),'shared shell missing '+token);
}
assert.ok(!shell.includes('window.CHUNBONG_CONTENT ='),'shared shell must not carry general content data');
assert.ok(content.includes('window.CHUNBONG_CONTENT ='),'content bundle must keep general content data');
assert.ok(content.includes('fanart-gallery.js'),'content bundle must keep fanart-specific runtime');
assert.ok(!content.includes('ChunbongCache'),'content bundle must not duplicate shared cache');
assert.ok(!content.includes('activity-center.js'),'content bundle must not duplicate shared activity runtime');
assert.ok(!content.includes('theme-toggle'),'content bundle must not duplicate shared theme controls');

for(const file of generalPages){
  const html=read(file);
  const shellAt=html.indexOf('src="site-shell.js"');
  const contentAt=html.indexOf('src="content.js"');
  const pageAt=html.indexOf('src="page.js');
  assert.ok(shellAt>=0,file+' missing site-shell.js');
  assert.ok(contentAt>shellAt,file+' must load content.js after site-shell.js');
  assert.ok(pageAt>contentAt,file+' must load page.js after content.js');
}

for(const file of gamePages){
  const html=read(file);
  const shellAt=html.indexOf('src="site-shell.js"');
  const pageAt=html.indexOf('src="page.js');
  assert.ok(shellAt>=0,file+' missing shared shell');
  assert.doesNotMatch(html,/src="content\.js"/,file+' must not load general content data');
  assert.ok(pageAt>shellAt,file+' must keep common page runtime after shared shell');
}

assert.match(serviceWorker,/\/site-shell\.js/,'offline app shell must include site-shell.js');
assert.match(serviceWorker,/chunbong-pwa-20260920-v13/,'PWA cache version must advance for shell split');

assert.ok(shell.length < 12500,'shared shell unexpectedly large');
assert.ok(content.length < 6500,'content data bundle unexpectedly large');

console.log('site shell split regression passed');
