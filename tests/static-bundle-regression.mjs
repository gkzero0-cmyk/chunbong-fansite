import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bundles,bundleContent} from '../scripts/build-static-bundles.mjs';

for(const entry of bundles){
  assert.equal(fs.readFileSync(entry.out,'utf8'),bundleContent(entry),entry.out+' must be regenerated when its source files change');
}
const home=fs.readFileSync('index.html','utf8');
const tarot=fs.readFileSync('tarot.html','utf8');
assert.match(home,/home-bundle\.css\?v=1/);
assert.match(home,/home-bundle\.js\?v=1/);
for(const retired of ['home-channel-buttons.css','home-overview.css','home-refresh.css','home-dday.js','home-smart-status.js'])assert.equal(home.includes(retired),false,'home must not load '+retired+' separately');
assert.match(tarot,/tarot-bundle\.css\?v=1/);
assert.match(tarot,/tarot-bundle\.js\?v=1/);
for(const retired of ['tarot-quality.css','tarot-composite.css','tarot-reading-v3.css','tarot-luxury-foil.css','tarot-data.js','tarot-composite.js'])assert.equal(tarot.includes(retired),false,'tarot must not load '+retired+' separately');
console.log('static bundle regression passed');
