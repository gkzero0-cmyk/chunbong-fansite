import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../chunbak.html',import.meta.url),'utf8');
for(const id of ['chunbak-game','chunbak-nickname','chunbak-start','chunbak-restart','chunbak-score','chunbak-best','chunbak-max-level','chunbak-ranking-status','chunbak-ranking-list','chunbak-stage','chunbak-canvas','chunbak-danger-line','chunbak-next','chunbak-stage-legend','chunbak-overlay']) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
assert.ok(html.includes('data-page="minigames"'));
assert.ok(html.includes('data-nav="minigames" href="minigames.html">미니게임</a>'));
assert.ok(html.includes('assets/vendor/matter-0.20.0.min.js'));
console.log('chunbak ui regression passed');
