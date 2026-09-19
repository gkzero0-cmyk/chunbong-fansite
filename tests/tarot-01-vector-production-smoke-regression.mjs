import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync(new URL('../.github/workflows/tarot-production-smoke.yml',import.meta.url),'utf8');
for(const token of [
  'c_crop,g_north_west,h_1488,w_898,x_0,y_0',
  'c_crop,g_north_west,h_1488,w_898,x_10776,y_0',
  'q_100/f_avif',
  'CARD0_HTTP',
  'CARD77_HTTP',
  "s.w!==898||s.h!==1488",
  "s.bytes>=1024*1024",
  "hrefs.every(h=>h.includes('/c_crop,')",
  'originalCardCropUrl',
  '12-card API'
]) assert.ok(workflow.includes(token), `missing tarot production smoke token: ${token}`);
assert.equal(workflow.includes("ORIGINAL_BASE/sheet-0.avif"),false,'production smoke should not validate full-sheet downloads as result-card assets');
console.log('tarot cropped-original production smoke source regression passed');
