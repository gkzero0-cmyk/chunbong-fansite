import assert from 'node:assert/strict';
import fs from 'node:fs';

const indexUrl = new URL('../index.html', import.meta.url);
const buttonsCssUrl = new URL('../home-channel-buttons.css', import.meta.url);

const index = fs.readFileSync(indexUrl, 'utf8');
assert.equal(fs.existsSync(buttonsCssUrl), true, 'home channel button stylesheet must exist');
const buttonsCss = fs.readFileSync(buttonsCssUrl, 'utf8');

assert.match(index, /<link rel="stylesheet" href="home-channel-buttons\.css">/, 'home page must load channel button styles after the base stylesheet');
assert.match(index, /class="btn btn-cafe"[^>]*>팬카페 ↗<\/a>/, 'home fan cafe button must use the dedicated cafe style');
assert.match(index, /class="btn btn-youtube"[^>]*>YouTube ↗<\/a>/, 'home YouTube button label must be shortened to YouTube');
assert.match(buttonsCss, /\.btn-cafe\s*\{[^}]*background:\s*#00c73c(?:;|\})/s, 'fan cafe button must use #00c73c');
assert.match(buttonsCss, /\.btn-youtube\s*\{[^}]*background:\s*#ff0033(?:;|\})/s, 'YouTube button must use #ff0033');

console.log('home channel button regression checks passed');
