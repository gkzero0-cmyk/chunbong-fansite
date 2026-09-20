import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const pages=[
  'index.html','schedule.html','notice.html','vod.html','clips.html','youtube.html','fanart.html','tarot.html',
  'history.html','data.html','minigames.html','changelog.html','chuntris.html','chunbak.html','chungwagame.html','chuncortile.html'
];

for(const page of pages){
  const html=read(page);
  assert.ok(html.includes('class="skip-link"'), `${page}: missing skip link`);
  assert.ok(html.includes('href="#main-content"'), `${page}: skip link target mismatch`);
  assert.ok(html.includes('id="main-content"'), `${page}: missing main-content target`);
  const themeScript=html.indexOf('src="theme-init.js"');
  const styles=html.indexOf('href="styles.css"');
  const themeCss=html.indexOf('href="theme.css" data-theme-styles');
  assert.ok(themeScript>=0, `${page}: missing theme-init.js`);
  assert.ok(themeCss>=0, `${page}: missing static theme.css`);
  assert.ok(themeScript<styles, `${page}: theme init must run before base CSS can paint`);
}

const init=read('theme-init.js');
assert.ok(init.includes("localStorage.getItem('chunbong-theme')"));
assert.ok(init.includes("document.documentElement.dataset.theme = theme"));

const home=read('index.html');
assert.match(home, /class="hero-character"[^>]*loading="eager"[^>]*decoding="async"[^>]*fetchpriority="high"/);
assert.ok(home.includes('src="assets/chunbong-main.webp"'), 'home hero artwork must remain unchanged');

const sw=read('service-worker.js');
assert.ok(sw.includes("chunbong-pwa-20260921-v23"));
assert.ok(sw.includes("'/theme.css'"));
assert.ok(sw.includes("'/theme-init.js'"));

const vercel=JSON.parse(read('vercel.json'));
for(const branch of ['internal-*','ci-*','docs-*','feat/*','fix/*','chore/*','ci/*','refactor/*','test/*','hotfix/*']){
  assert.equal(vercel.git?.deploymentEnabled?.[branch],false,`Vercel must skip ${branch} branches`);
}
assert.equal(vercel.git?.deploymentEnabled?.['data/soop-telemetry'],false);
assert.equal(vercel.git?.deploymentEnabled?.main,true,'Vercel production branch must remain enabled');

console.log('site theme, accessibility, PWA shell and deployment hygiene regression passed');
