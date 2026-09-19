import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const exists=path=>fs.existsSync(new URL(path,root));
const read=path=>fs.readFileSync(new URL(path,root),'utf8');

for(let pair=0;pair<39;pair+=1){
  const name=`assets/tarot/hd/pair-${String(pair).padStart(2,'0')}.avif`;
  assert.equal(exists(name),false,`obsolete tarot pair asset must be removed: ${name}`);
}
assert.equal(exists('scripts/upscale-tarot-hd.py'),false,'obsolete local super-resolution generator must be removed');
assert.equal(exists('.github/workflows/tarot-superres-assets.yml'),false,'obsolete tarot super-resolution workflow must be removed');
assert.equal(exists('tests/tarot-hd-assets-regression.mjs'),false,'obsolete HD pair regression must be removed');
assert.equal(exists('tests/tarot-superres-regression.mjs'),false,'obsolete super-resolution regression must be removed');

const tarot=read('tarot.js');
const composite=read('tarot-composite.js');
const production=read('.github/workflows/tarot-production-smoke.yml');
assert.ok(tarot.includes('c_crop,g_north_west'),'fallback runtime must use individual Cloudinary card crops');
assert.ok(tarot.includes('f_auto/q_auto'),'fallback runtime must preserve current automatic format/quality delivery');
assert.ok(!tarot.includes('assets/tarot/hd/'),'runtime must not reference removed local pair assets');
assert.ok(composite.includes('originalArtworkDescriptor'),'composite renderer must keep uploaded-original card mapping');
assert.ok(composite.includes('f_auto/q_auto'),'primary composite renderer must keep optimized Cloudinary delivery');
assert.equal(production.includes('assets/tarot/hd/**'),false,'production smoke must not trigger on removed pair assets');

console.log('obsolete tarot pair assets and super-resolution pipeline removed safely');
