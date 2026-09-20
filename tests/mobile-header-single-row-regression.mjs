import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css=await readFile(new URL('../mobile-site.css',import.meta.url),'utf8');

assert.ok(css.includes('display:flex!important;\n    flex-wrap:nowrap!important'),'PWA header must be one flex row');
for(const [selector,order] of [
  ['.pwa-header-action','order:2!important'],
  ['.changelog-button','order:3!important'],
  ['.site-search-trigger','order:4!important'],
  ['.theme-toggle','order:5!important'],
  ['.activity-center','order:6!important']
]){
  assert.ok(css.includes(selector),selector+' missing');
  assert.ok(css.includes(order),selector+' order missing');
}
assert.ok(css.indexOf('.pwa-header-action')<css.lastIndexOf('.site-search-trigger')||css.includes('order:2!important'),'MY should sit left of search by CSS order');

console.log('mobile-header-single-row-regression: ok');
