import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../minigames.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigames.css',import.meta.url),'utf8');
const asset=fs.readFileSync(new URL('../assets/minigames-hero.svg',import.meta.url),'utf8');

assert.match(html,/class="page-shell minigames-hero-layout reveal"/,'minigames hero must use a two-column layout shell');
assert.match(html,/class="minigames-hero-copy"/);
assert.match(html,/class="minigames-hero-art"/);
assert.match(html,/src="assets\/minigames-hero\.svg"/,'hero must use the repository-local user artwork');
assert.match(html,/alt="게임을 즐기는 춘봉 일러스트"/,'hero artwork needs descriptive alt text');
assert.match(css,/grid-template-columns:minmax\(0,.8fr\) minmax\(420px,1.2fr\)/,'desktop hero must reserve the right side for artwork');
assert.match(css,/\.minigames-hero-art\{[^}]*aspect-ratio:16\/9/s,'hero artwork must remain 16:9');
assert.match(css,/@media\(max-width:760px\)\{[^}]*\.minigames-hero-layout\{grid-template-columns:1fr/s,'mobile hero must stack to one column');
assert.match(asset,/data:image\/webp;base64,/,'hero SVG must embed the optimized user image');
assert.match(asset,/viewBox="0 0 400 225"/,'embedded artwork must retain 16:9 dimensions');

console.log('minigames hero artwork regression passed');
