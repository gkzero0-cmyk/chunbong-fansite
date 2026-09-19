import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../minigames.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../minigames.css',import.meta.url),'utf8');
const assetPath=new URL('../assets/minigames-hero-hq.webp',import.meta.url);
const assetStat=fs.statSync(assetPath);
assert.equal(fs.existsSync(new URL('../assets/minigames-hero.webp',import.meta.url)),false,'obsolete low-resolution minigames hero must stay removed');
assert.equal(fs.existsSync(new URL('../assets/minigames/minigames-hero.webp',import.meta.url)),false,'duplicate nested minigames hero must stay removed');

assert.match(html,/class="page-shell minigames-hero-layout reveal"/,'minigames hero must use a two-column layout shell');
assert.match(html,/class="minigames-hero-copy"/);
assert.match(html,/class="minigames-hero-art"/);
assert.match(html,/src="assets\/minigames-hero-hq\.webp\?v=20260919c"/,'hero must use the bundled high-resolution WebP artwork');
assert.match(html,/data-fallback-src="assets\/minigames-hero\.svg\?v=20260919b"/,'hero must retain the local SVG fallback');
assert.match(html,/onerror="[^"]*dataset\.fallbackSrc/,'hero must switch to fallback if the high-resolution asset fails');
assert.match(css,/url\('assets\/minigames-hero\.svg\?v=20260919b'\)/,'hero figure must keep a CSS background fallback');
assert.match(html,/alt="게임을 즐기는 춘봉 일러스트"/,'hero artwork needs descriptive alt text');
assert.match(html,/width="1440" height="810"/,'hero image should expose its high-resolution intrinsic dimensions');
assert.match(css,/grid-template-columns:minmax\(0,.8fr\) minmax\(420px,1.2fr\)/,'desktop hero must reserve the right side for artwork');
assert.match(css,/\.minigames-hero-art\{[^}]*aspect-ratio:16\/9/s,'hero artwork must remain 16:9');
assert.ok(
  css.includes('@media(max-width:760px){') &&
  css.includes('.minigames-hero-layout{grid-template-columns:1fr;gap:24px}'),
  'mobile hero must stack to one column'
);
assert.ok(assetStat.size>60000,'high-resolution hero asset unexpectedly small');
const signature=fs.readFileSync(assetPath).subarray(0,12);
assert.equal(signature.subarray(0,4).toString(),'RIFF','hero asset must be RIFF WebP');
assert.equal(signature.subarray(8,12).toString(),'WEBP','hero asset must be a valid WebP container');

console.log('minigames hero artwork regression passed');
