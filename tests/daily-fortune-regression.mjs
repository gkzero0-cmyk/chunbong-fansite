import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const home = read('index.html');
const js = read('daily-fortune.js');
const css = read('daily-fortune.css');
const sw = read('service-worker.js');

assert.doesNotThrow(() => new Function(js), 'daily fortune runtime must remain valid JavaScript');
assert.match(home, /href="daily-fortune\.css"/, 'home daily fortune CSS missing');
assert.match(home, /src="daily-fortune\.js"/, 'home daily fortune runtime missing');
assert.match(js, /timeZone: SEOUL_TZ/, 'daily fortune must use the Seoul timezone');
assert.match(js, /const STORAGE_KEY = 'chunbong-daily-fortune-v1'/, 'daily fortune storage key missing');
assert.match(js, /parsed\?\.date !== today/, 'stored result must expire on the next KST date');
assert.match(js, /randomInt\(CARDS\.length\)/, 'daily fortune must draw from the Major Arcana list');
assert.match(js, /CARDS = \[/, 'Major Arcana data missing');
assert.match(js, /\['세계'/, 'all Major Arcana cards must include The World');
assert.match(js, /c_crop,g_north_west/, 'daily fortune must request a card-level Cloudinary crop');
assert.match(js, /f_auto\/q_auto/, 'daily fortune card image must use automatic format and quality');
assert.match(js, /playRevealSound/, 'daily fortune reveal sound missing');
assert.match(js, /showModal\(\)/, 'daily fortune must open as a dialog');
assert.match(js, /data-daily-fortune-launcher/, 'persistent bottom-right reopen launcher missing');
assert.match(css, /\.daily-fortune-launcher\{position:fixed/, 'launcher must remain fixed on screen');
assert.match(css, /\.daily-fortune-card\.is-revealed \.daily-fortune-card-inner\{transform:rotateY\(180deg\) rotateZ\(1turn\)\}/, 'card flip animation missing');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/, 'reduced-motion fallback missing');
assert.match(sw, /chunbong-pwa-20260920-v12/, 'daily fortune service worker revision missing');
assert.match(sw, /'\/daily-fortune\.css'/);
assert.match(sw, /'\/daily-fortune\.js'/);

console.log('home daily fortune regression passed');
