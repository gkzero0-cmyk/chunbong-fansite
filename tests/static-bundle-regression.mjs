import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bundles,bundleContent} from '../scripts/build-static-bundles.mjs';

for(const entry of bundles){
  assert.equal(fs.readFileSync(entry.out,'utf8'),bundleContent(entry),entry.out+' must be regenerated when its source files change');
}
const tarot=fs.readFileSync('tarot.html','utf8');
assert.match(tarot,/tarot-bundle\.css\?v=1/);
assert.match(tarot,/tarot-bundle\.js\?v=1/);
for(const retired of ['tarot.css','tarot-quality.css','tarot-composite.css','tarot-hero-banner.css','tarot-reading-v3.css','tarot-luxury-foil.css','tarot-data.js','tarot-reading-config.js','tarot-sfx-v2-preload.js','tarot.js?v=7','tarot-sfx-v2.js','tarot-composite.js'])assert.equal(tarot.includes(retired),false,'tarot must not load '+retired+' separately');
console.log('tarot static bundle regression passed');
