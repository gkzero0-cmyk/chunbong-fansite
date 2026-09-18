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
assert.match(ctCss,/width:min\(340px,36svh,calc\(100vw - 28px\)\)/,'Chuntris board must be viewport-height-aware');
assert.match(ctCss,/\.chuntris-page \.content-section\{padding:4px 0 28px\}/,'Chuntris game must be raised by compacting content spacing');
assert.match(ctCss,/background:linear-gradient\(135deg,#ff6416,#ff9f31\)/,'Chuntris start action must use fan-site orange palette');
assert.match(ctJs,/const frames=\['3','2','1','START!'\]/,'Chuntris 3-2-1 countdown sequence missing');
assert.match(ctJs,/uiState==='countdown'/,'Chuntris countdown state missing');
assert.match(ctJs,/countdownTimer=setTimeout\(advance,700\)/,'Chuntris countdown must delay engine start');
assert.match(ctJs,/getUiState:\(\)=>uiState/,'Chuntris countdown state must be inspectable for smoke tests');

assert.match(cbHtml,/chunbak-board-start-ui\.css/,'Chunbak board UI override must load last');
assert.match(cbCss,/width:min\(420px,46svh,calc\(100vw - 28px\)\)/,'Chunbak start/stage must be viewport-height-aware');
assert.match(cbCss,/aspect-ratio:420\/680/,'Chunbak start screen must match gameplay stage ratio');
assert.match(cbCss,/\.chunbak-page \.content-section\{padding:4px 0 28px\}/,'Chunbak game must be raised by compacting content spacing');
assert.match(cbCss,/\.chunbak-start-utils\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'Chunbak board-sized menu must retain ranking/sound/controls');
assert.match(cbCss,/background:linear-gradient\(135deg,#ff6416,#ff9f31\)/,'Chunbak start action must use fan-site orange palette');

console.log('Chuntris/Chunbak board-sized start UI regression passed');
