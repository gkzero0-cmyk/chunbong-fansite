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
