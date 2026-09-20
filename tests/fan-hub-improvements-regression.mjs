import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personal = await readFile(new URL('../personal-hub.js', import.meta.url), 'utf8');
const tarot = await readFile(new URL('../tarot.js', import.meta.url), 'utf8');
const schedule = await readFile(new URL('../live-fixes.js', import.meta.url), 'utf8');
const filter = await readFile(new URL('../content-filter.js', import.meta.url), 'utf8');
const shell = await readFile(new URL('../site-shell.js', import.meta.url), 'utf8');
const content = await readFile(new URL('../content.js', import.meta.url), 'utf8');

for (const token of ['exportBackup','importBackupFile','resetPersonalData','attachTarotReading','data-view-tarot','personal-tarot-archive-dialog']) {
  assert.ok(personal.includes(token), 'personal hub missing '+token);
}
assert.ok(tarot.includes('chunbong:tarot-reading-detail'), 'tarot detail archive event missing');
for (const token of ['downloadScheduleIcs','shareSchedule','data-schedule-calendar','data-schedule-share','mobileDateFilter']) {
  assert.ok(schedule.includes(token), 'schedule enhancement missing '+token);
}
assert.ok(filter.includes("['vod','clips','youtube','fanart']"), 'content filter pages missing');
assert.ok(content.includes('content-filter.js') && content.includes('content-filter.css'), 'content filter not wired into content runtime');

for (const path of ['chuntris-postgame-ranking.js','chunbak-postgame-ranking.js','chungwagame-postgame-ranking.js','chuncortile-postgame-ranking.js']) {
  const source = await readFile(new URL('../'+path, import.meta.url), 'utf8');
  assert.ok(source.includes('chunbong:player:nickname:v1'), path+' missing shared player nickname');
}

console.log('fan-hub-improvements-regression: ok');
