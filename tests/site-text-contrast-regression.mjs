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

function luminance(hex){
  const channels=hex.replace('#','').match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
assert.ok(contrastRatio('#625951','#fffaf6')>=4.5,'light muted/meta text must meet 4.5:1 on the common light panel');
assert.ok(contrastRatio('#9A938D','#111113')>=4.5,'dark meta text must meet 4.5:1 on the common dark panel');
