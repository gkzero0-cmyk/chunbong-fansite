import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css=await readFile(new URL('../mobile-site.css',import.meta.url),'utf8');
const js=await readFile(new URL('../mobile-site.js',import.meta.url),'utf8');

assert.ok(js.includes("mobile-compact-header"),'all phone browsers must receive the compact app header');
assert.match(css,/\.site-header\.mobile-compact-header\{[\s\S]*flex-wrap:nowrap!important/,'mobile app header must stay on one row');
assert.match(css,/\.site-header\.mobile-compact-header \.site-search-trigger\{[\s\S]*order:1!important/,'search must remain a primary mobile header action');
assert.match(css,/\.site-header\.mobile-compact-header \.activity-center\{[\s\S]*order:2!important/,'notifications must remain a primary mobile header action');
assert.match(css,/\.site-header\.mobile-compact-header :is\([\s\S]*\.pwa-header-action,[\s\S]*\.changelog-button,\.theme-toggle[\s\S]*\)\{display:none!important\}/,'secondary utilities must move out of the compact mobile header');
assert.match(js,/data-mobile-theme-toggle/,'theme control must move into the More sheet');

console.log('mobile-header-single-row-regression: ok');
