import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../minigames.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigames.css',import.meta.url),'utf8');

assert.match(html,/class="page-shell minigames-hero-inner reveal"/);
assert.match(html,/class="minigames-hero-copy"/);
assert.match(html,/class="minigames-hero-art"/);
assert.match(html,/src="assets\/minigames\/minigames-hero\.webp"/);
assert.match(html,/width="760" height="428"/);
assert.match(html,/fetchpriority="high"/);
assert.match(css,/grid-template-columns:minmax\(0,\.82fr\) minmax\(420px,1\.18fr\)/);
assert.match(css,/\.minigames-hero-art\{[^}]*justify-self:end/);
assert.match(css,/\.minigames-hero-art img\{[^}]*aspect-ratio:760\/428/);
assert.match(css,/@media\(max-width:760px\)\{[^}]*\.minigames-hero-inner\{grid-template-columns:1fr/);
assert.match(css,/\[data-theme="light"\] \.minigames-hero-art/);

console.log('minigames hero artwork regression passed');
