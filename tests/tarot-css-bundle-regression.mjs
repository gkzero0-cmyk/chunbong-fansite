import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('tarot.html');
const bundle=read('tarot-bundle.css');
const generator=read('scripts/build-tarot-css.mjs');

assert.match(html,/href="tarot-bundle\.css\?v=1"/,'tarot page must load the generated stylesheet bundle');
for(const file of ['tarot.css','tarot-quality.css','tarot-composite.css','tarot-hero-banner.css','tarot-reading-v3.css','tarot-luxury-foil.css']){
  assert.ok(bundle.includes('===== '+file+' ====='),'bundle must include '+file);
  assert.ok(generator.includes(file),'bundle generator must track '+file);
}
assert.doesNotMatch(html,/href="tarot(?:-quality|-composite|-hero-banner|-reading-v3|-luxury-foil)?\.css/,'tarot page must not load the split tarot CSS files separately');
assert.ok(Buffer.byteLength(bundle,'utf8')<60000,'tarot bundle must stay under a 60KB source budget');

console.log('tarot CSS bundle regression passed');
