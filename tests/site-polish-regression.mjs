import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const home = read('index.html');
const hero = home.match(/<img class="hero-character"[^>]*>/)?.[0] || '';
assert.ok(hero, 'home hero image missing');
assert.match(hero, /src="assets\/chunbong-main\.webp"/, 'home hero artwork source must remain unchanged');
assert.match(hero, /width="794"/, 'home hero must reserve its intrinsic width');
assert.match(hero, /height="875"/, 'home hero must reserve its intrinsic height');
assert.match(hero, /loading="eager"/, 'home hero must stay eager');
assert.match(hero, /decoding="async"/, 'home hero must stay async-decoded');
assert.match(hero, /fetchpriority="high"/, 'home hero must stay high priority');

const vercel = JSON.parse(read('vercel.json'));
const global = (vercel.headers || []).find(item => item.source === '/(.*)');
assert.ok(global, 'global response headers missing');
const headers = Object.fromEntries((global.headers || []).map(row => [row.key.toLowerCase(), row.value]));
assert.equal(headers['x-content-type-options'], 'nosniff');
assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
assert.equal(headers['permissions-policy'], 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

console.log('home layout reservation and baseline security headers regression passed');
