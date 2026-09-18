import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../minigames.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigames.css',import.meta.url),'utf8');
const assetPath=new URL('../assets/minigames/minigames-hero.webp',import.meta.url);
const assetStat=fs.statSync(assetPath);

assert.match(html,/class="page-shell minigames-hero-layout reveal"/,'minigames hero must use a two-column layout shell');
assert.match(html,/class="minigames-hero-copy"/);
assert.match(html,/class="minigames-hero-art"/);
assert.match(html,/src="assets\/minigames\/minigames-hero\.webp"/,'hero must use the higher-resolution repository-local artwork');
assert.match(html,/alt="게임을 즐기는 춘봉 일러스트"/,'hero artwork needs descriptive alt text');
assert.match(html,/width="760" height="428"/,'hero image should expose its higher-resolution intrinsic dimensions');
assert.match(css,/grid-template-columns:minmax\(0,.8fr\) minmax\(420px,1.2fr\)/,'desktop hero must reserve the right side for artwork');
assert.match(css,/\.minigames-hero-art\{[^}]*aspect-ratio:16\/9/s,'hero artwork must remain 16:9');
assert.ok(
  css.includes('@media(max-width:760px){') &&
  css.includes('.minigames-hero-layout{grid-template-columns:1fr;gap:24px}'),
  'mobile hero must stack to one column'
);
assert.ok(assetStat.size>12000,'higher-resolution hero asset unexpectedly small');

console.log('minigames hero artwork regression passed');
