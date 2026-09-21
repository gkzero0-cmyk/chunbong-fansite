import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../site-design-system.css',import.meta.url),'utf8');
for(const selector of ['.page-hero h1','.section-head h2','.portal-card strong','.home-overview-card strong','.activity-item-copy>strong','.personal-panel h2']){
  assert.ok(css.includes(selector),selector+' shared text hierarchy missing');
}
for(const token of ['color:var(--text-primary)','color:var(--text-secondary)','color:var(--text-muted)']){
  assert.ok(css.includes(token),token+' missing from shared text hierarchy');
}
console.log('site text contrast regression passed');

assert.match(css,/--text-meta:#9A938D/,'dark meta text must stay readable on dark panels');
assert.match(css,/--text-muted:#625951/,'light muted text must meet the raised contrast target');
assert.match(css,/--text-meta:#625951/,'light meta text must meet the raised contrast target');
assert.match(css,/\.copyright[\s\S]*color:var\(--text-muted\)!important/,'footer copyright must use the readable shared token');
assert.match(css,/\.personal-alert-default[\s\S]*color:var\(--text-muted\)!important/,'fan hub microcopy must use the readable shared token');
