import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

const chunbak=read('chunbak.js');
const core=read('chunbak-game-core.js');
assert.ok(core.includes('assets/chunbak/${id}.webp'));
assert.ok(chunbak.includes('Core.STAGES.slice(0, 5)'));
assert.ok(chunbak.includes('requestIdleCallback'));

const tarot=read('tarot.js');
const composite=read('tarot-composite.js');
assert.ok(tarot.includes('c_crop,g_north_west'));
assert.ok(tarot.includes('q_100/f_avif'));
assert.ok(composite.includes('originalCardCropUrl'));
assert.ok(composite.includes('sheetWidth: ORIGINAL_SHEET_CELL_WIDTH'));
assert.ok(!composite.includes('sheetWidth: ORIGINAL_SHEET_WIDTH,\n    sheetHeight: ORIGINAL_SHEET_HEIGHT'), 'result cards must not request full 13-card sheet geometry');

const api=read('api/content.js');
assert.ok(api.includes('Boolean(payload?.fallback)'));
assert.ok(api.includes("'no-store, max-age=0'"));

const schedule=read('live-fixes.js');
assert.ok(schedule.includes('fallbackScheduleStatus'));
assert.ok(schedule.includes('최신 정보 확인 필요'));

console.log('fan-site media, cache and schedule optimization regression passed');
