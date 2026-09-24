import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bundleContent, sources } from '../scripts/build-tarot-js.mjs';

const bundle=fs.readFileSync('tarot-bundle.js','utf8');
assert.equal(bundle,bundleContent(),'tarot-bundle.js must be regenerated when a source file changes');
const html=fs.readFileSync('tarot.html','utf8');
assert.match(html,/src="tarot-bundle\.js\?v=1"/,'tarot page must load the generated JS bundle');
for(const retired of ['tarot-data.js','tarot-reading-config.js','tarot-sfx-v2-preload.js','tarot.js?v=7','tarot-sfx-v2.js','tarot-composite.js']){
  assert.equal(html.includes(retired),false,'tarot page must not load '+retired+' separately');
}
for(const file of sources)assert.ok(bundle.includes('===== '+file+' ====='),'bundle must include '+file);
console.log('tarot JS bundle regression passed');
