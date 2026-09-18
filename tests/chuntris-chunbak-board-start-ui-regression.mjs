import fs from 'node:fs';
import assert from 'node:assert/strict';

const ctHtml=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const ctJs=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
const ctCss=fs.readFileSync(new URL('../chuntris-board-start-ui.css',import.meta.url),'utf8');
const cbHtml=fs.readFileSync(new URL('../chunbak.html',import.meta.url),'utf8');
const cbCss=fs.readFileSync(new URL('../chunbak-board-start-ui.css',import.meta.url),'utf8');

assert.match(ctHtml,/chuntris-board-start-ui\.css/,'Chuntris board UI override must load last');
assert.match(ctHtml,/id="chuntris-countdown"/,'Chuntris countdown layer missing');
assert.match(ctHtml,/id="chuntris-countdown-value"/,'Chuntris countdown value missing');
assert.match(ctCss,/aspect-ratio:1\/2/,'Chuntris start/board must retain 10x20 ratio');
assert.match(ctCss,/html,\.chuntris-page\{overflow-anchor:none\}/,'Chuntris page must disable page-level scroll anchoring');
assert.match(ctCss,/--chuntris-board-width:min\(340px,36svh,calc\(100vw - 28px\)\)/,'Chuntris board must be viewport-height-aware');
assert.match(ctCss,/--chuntris-toolbar-height:56px/,'Chuntris must reserve the exact play toolbar height before the start card');
assert.match(ctCss,/padding:calc\(var\(--chuntris-toolbar-height\) \+ var\(--chuntris-board-gap\)\) 0 0/,'Chuntris start card must align vertically with the live board');
assert.equal((ctHtml.match(/chuntris-return-link/g)||[]).length,2,'Chuntris must expose minigames return links in pause and game-over UI');
assert.match(ctCss,/min-width:var\(--chuntris-board-width\)!important/,'mobile Chuntris play board must not collapse below the shared start width');
assert.match(ctCss,/\.chuntris-page \.content-section\{padding:4px 0 28px\}/,'Chuntris game must be raised by compacting content spacing');
assert.match(ctCss,/background:linear-gradient\(135deg,#ff6416,#ff9f31\)/,'Chuntris start action must use fan-site orange palette');
assert.match(ctJs,/const frames=\['3','2','1','START!'\]/,'Chuntris 3-2-1 countdown sequence missing');
assert.match(ctJs,/uiState==='countdown'/,'Chuntris countdown state missing');
assert.match(ctJs,/countdownTimer=setTimeout\(advance,700\)/,'Chuntris countdown must delay engine start');
assert.match(ctJs,/getUiState:\(\)=>uiState/,'Chuntris countdown state must be inspectable for smoke tests');
assert.match(ctJs,/function restoreStartViewport\(\)/,'Chuntris must explicitly restore viewport after start/play swap');
assert.match(ctJs,/startViewportY=typeof root\.scrollY==='number'\?root\.scrollY:0/,'Chuntris must capture scroll position before countdown');

assert.match(cbHtml,/chunbak-board-start-ui\.css/,'Chunbak board UI override must load last');
assert.match(cbCss,/width:min\(420px,44svh,calc\(100vw - 28px\)\)/,'Chunbak start/stage must be viewport-height-aware');
assert.match(cbCss,/--chunbak-toolbar-height:58px/,'Chunbak must reserve the exact play toolbar height before the start card');
assert.match(cbCss,/padding-top:calc\(var\(--chunbak-toolbar-height\) \+ var\(--chunbak-board-gap\)\)/,'Chunbak start card must align vertically with the live stage');
assert.equal((cbHtml.match(/chunbak-return-link/g)||[]).length,2,'Chunbak must expose minigames return links in pause and game-over UI');
assert.match(cbCss,/aspect-ratio:420\/680/,'Chunbak start screen must match gameplay stage ratio');
assert.match(cbCss,/\.chunbak-page \.content-section\{padding:4px 0 28px\}/,'Chunbak game must be raised by compacting content spacing');
assert.match(cbCss,/\.chunbak-start-utils\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'Chunbak board-sized menu must retain ranking/sound/controls');
assert.match(cbCss,/\.chunbak-center\{order:1\}/,'mobile Chunbak must place the playable stage before stats so the board is not pushed below the viewport');
assert.match(cbCss,/background:linear-gradient\(135deg,#ff6416,#ff9f31\)/,'Chunbak start action must use fan-site orange palette');

console.log('Chuntris/Chunbak board-sized start UI regression passed');
