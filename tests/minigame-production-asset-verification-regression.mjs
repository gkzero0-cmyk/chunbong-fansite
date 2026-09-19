import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const chungwa=read('.github/workflows/chungwagame-production-smoke.yml');
const chuncor=read('.github/workflows/chuncortile-production-smoke.yml');
const chuncorBrowser=read('.github/workflows/chuncortile-browser-smoke.yml');
const chungwaBrowser=read('.github/workflows/chungwagame-pr-browser-smoke.yml');

for(const [name,source] of [['Chungwagame',chungwa],['Chuncortile',chuncor]]){
  assert.match(source,/sha256sum/,`${name} production smoke must compare exact file hashes`);
  assert.match(source,/game-layout\.css/,`${name} production smoke must track shared desktop layout`);
  assert.match(source,/mobile-minigames\.css/,`${name} production smoke must track mobile layout`);
  assert.match(source,/cache-control: no-cache/,`${name} production smoke must bypass stale CDN responses`);
  assert.match(source,/for file in "\$\{files\[@\]\}"; do/,`${name} production smoke must expand the Bash asset array`);
  assert.doesNotMatch(source,/for file in "\\\\\$\{files\[@\]\}"; do/,`${name} production smoke must not escape Bash array expansion`);
}

assert.match(chungwa,/chungwagame\.css/);
assert.match(chungwa,/assets\/chungwagame\/numbers\.webp/);
assert.match(chuncor,/chuncortile\.css/);
assert.match(chuncor,/assets\/chuncortile\/tiles-user\.webp/);
assert.match(chuncor,/removed count disappeared too quickly/,'production smoke must verify readable clear-count duration');
assert.match(chuncor,/burstCount>0&&burstCount<=removed\*4/,'production smoke must verify particle cap');
assert.match(chuncorBrowser,/assets\/chuncortile\/tiles-user\.webp/,'local browser smoke must watch the active tile sprite');
assert.doesNotMatch(chuncorBrowser,/assets\/chuncortile\/tiles\.png/,'obsolete tile sprite must not be the only trigger');
assert.match(chuncorBrowser,/mobile-minigames\.css/,'local Chuncortile smoke must watch mobile layout');
assert.match(chungwaBrowser,/mobile-minigames\.css/,'local Chungwagame smoke must watch mobile layout');

console.log('minigame production asset verification regression passed');
