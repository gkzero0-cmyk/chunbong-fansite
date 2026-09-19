import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const ctHtml = read('chuncortile.html');
const ctCss = read('chuncortile.css');
const ctJs = read('chuncortile.js');
const scoreRace = read('score-race-multiplayer.js');
const apiSource = read('lib/minigame-multiplayer-api.js');
const chuntrisHtml = read('chuntris.html');
const chunbakHtml = read('chunbak.html');
const multiplayerCss = read('minigame-multiplayer.css');
const chungwaCss = read('chungwagame.css');
const siteCss = read('styles.css');

assert.match(chuntrisHtml, /chuntris-mode-score180[\s\S]*data-chuntris-multiplayer/);
assert.equal((chuntrisHtml.match(/data-chuntris-multiplayer/g) || []).length, 1);
assert.match(chunbakHtml, /id="chunbak-start"[\s\S]*class="chunbak-multiplayer-main" data-score-multiplayer="chunbak"/);
assert.match(multiplayerCss, /\.chuntris-multiplayer-main[\s\S]*min-height:48px/);
assert.match(multiplayerCss, /\.chunbak-multiplayer-main/);

assert.match(ctHtml, /minigame-multiplayer\.css/);
assert.match(ctHtml, /data-score-multiplayer="chuncortile"/);
assert.ok(!ctHtml.includes('\\n'), 'Chuncortile HTML must not contain literal escaped newlines');
assert.match(ctHtml, /minigame-multiplayer\.js[\s\S]*chuncortile\.js[\s\S]*score-race-multiplayer\.js/);
assert.match(apiSource, /chuncortile:\s*'score120'/);
assert.match(scoreRace, /chuncortile:\s*\{/);
assert.match(scoreRace, /ChuncortileApp\.startGame\(\{seed,random:root\.MinigameMultiplayer\.seededRandom\(seed\),multiplayer:true\}\)/);
assert.match(ctJs, /options\?\.multiplayer/);
assert.match(ctJs, /externalRandom\|\|Core\.seededRandom\(seed\)/);

assert.match(ctCss, /width:min\(1100px,96vw\)/);
assert.match(ctCss, /grid-template-columns:150px minmax\(0,760px\) 104px/);
assert.match(ctCss, /assets\/chuncortile\/tiles-user\.webp/);
assert.ok(fs.existsSync(new URL('../assets/chuncortile/tiles-user.webp', import.meta.url)));

assert.match(siteCss, /\.ct-shell\{width:min\(1520px,96vw\)!important/);
assert.match(siteCss, /\.chungwagame-shell\{width:min\(1520px,96vw\)!important/);
assert.match(siteCss, /\.ct-shell\{width:min\(1840px,94vw\)!important/);
assert.match(siteCss, /\.chungwagame-shell\{width:min\(1840px,94vw\)!important/);

const paletteMarker = chungwaCss.lastIndexOf('/* Requested comfort palette: 2026-09-19 */');
assert.ok(paletteMarker >= 0);
const palette = chungwaCss.slice(paletteMarker);
assert.match(palette, /background:#252A22/);
assert.match(palette, /border-color:#4A5142/);
assert.match(palette, /background:#30362C/);
assert.match(palette, /rgba\(226,228,221,\.085\)/);

console.log('chuncortile multiplayer/ui regression: ok');
