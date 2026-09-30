import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const mobileLoader = read('mobile-runtime-loader.js');
const polishRuntime = read('sitewide-polish.js');
const myhub = read('myhub.html');
const personalHub = read('personal-hub.js');

assert.ok(mobileLoader.length < 1800, 'mobile runtime loader must stay within the existing performance budget');
assert.match(mobileLoader, /sitewide-mobile-polish\.css/, 'mobile sitewide polish stylesheet must be loaded');
assert.match(mobileLoader, /sitewide-polish\.js/, 'sitewide polish runtime must be split from the tiny mobile loader');
assert.match(polishRuntime, /ArrowRight/, 'public tablists must support ArrowRight');
assert.match(polishRuntime, /ArrowLeft/, 'public tablists must support ArrowLeft');
assert.match(polishRuntime, /Home/, 'public tablists must support Home');
assert.match(polishRuntime, /End/, 'public tablists must support End');
assert.match(polishRuntime, /tabindex/, 'public tabs must use roving tabindex');
assert.match(polishRuntime, /archive-filter-toggle/, 'mobile content archive must expose a detailed-filter toggle');
assert.match(polishRuntime, /archive-filter-advanced/, 'mobile content archive must group advanced filters');

const polishCss = read('sitewide-mobile-polish.css');
assert.match(polishCss, /\.data-calendar-controls button[^}]*min-width:\s*44px/s, 'data calendar controls must have 44px touch targets');
assert.match(polishCss, /\.data-calendar-controls button[^}]*min-height:\s*44px/s, 'data calendar controls must have 44px touch targets');
assert.match(polishCss, /\.data-measurement-badge/, 'data badges must receive mobile readability overrides');
assert.match(polishCss, /font-size:\s*11px/, 'mobile metadata must have an 11px readability floor');
assert.match(polishCss, /\.archive-filter-toggle/, 'archive filter toggle must have mobile styling');
assert.match(polishCss, /min-height:\s*44px/, 'mobile interactive controls must retain 44px touch targets');

assert.match(myhub, /data-nav="contents"[^>]*href="chunbong-contents\.html"/, 'MY hub must include the content archive in its shared navigation');
assert.match(myhub, /class="header-live"[^>]*sooplive\.com\/station\/chunbongtv/, 'MY hub must include the SOOP header shortcut');

assert.match(personalHub, /function exportBackup\(/, 'MY hub backup export must remain available');
assert.match(personalHub, /function importBackupFile\(/, 'MY hub backup import must remain available');
assert.match(personalHub, /data-personal-export/, 'MY hub must render backup controls');

console.log('sitewide P1 polish regression OK');
