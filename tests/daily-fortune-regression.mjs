import assert from 'node:assert/strict';
import fs from 'node:fs';
import DATA from '../tarot-data.js';
import API from '../daily-fortune.js';

assert.equal(API.MAJOR_COUNT,22);
assert.equal(DATA.cards.filter(card=>card.arcana==='major').length,22);

assert.equal(API.kstDateKey(new Date('2026-09-19T14:59:59.000Z')),'2026-09-19');
assert.equal(API.kstDateKey(new Date('2026-09-19T15:00:00.000Z')),'2026-09-20');
assert.ok(API.millisecondsUntilNextKstMidnight(new Date('2026-09-19T14:00:00.000Z'))>0);
assert.ok(API.millisecondsUntilNextKstMidnight(new Date('2026-09-19T14:00:00.000Z'))<=3600000);

const sequence=[0,0.1];
const first=API.chooseDailyFortune(DATA.cards,()=>sequence.shift());
assert.deepEqual(first,{cardIndex:0,orientation:'upright'});
const last=API.chooseDailyFortune(DATA.cards,()=>0.999999);
assert.equal(last.cardIndex,21);
assert.equal(last.orientation,'reversed');

assert.match(API.dailyCardCropUrl(0),/h_1488,w_898,x_0,y_0\/q_100\/f_avif\/chunbong-fansite\/tarot-original\/sheet-0\.avif$/);
assert.match(API.dailyCardCropUrl(21),/h_1488,w_898,x_7184,y_0\/q_100\/f_avif\/chunbong-fansite\/tarot-original\/sheet-1\.avif$/);
assert.equal(API.dailyCardCropUrl(22),'');

const bag=new Map();
const storage={
  getItem:key=>bag.has(key)?bag.get(key):null,
  setItem:(key,value)=>bag.set(key,String(value)),
  removeItem:key=>bag.delete(key)
};
const record={dateKey:'2026-09-19',cardIndex:7,orientation:'upright',drawnAt:123};
assert.equal(API.saveDailyFortune(storage,record),true);
assert.deepEqual(API.loadDailyFortune(storage,'2026-09-19',DATA.cards),record);
assert.equal(API.loadDailyFortune(storage,'2026-09-20',DATA.cards),null);

const reading=API.buildDailyReading(DATA.cards[19],'upright');
assert.equal(reading.direction,'정방향');
assert.match(reading.title,/태양/);
assert.match(reading.meaning,/성취|활력|명확함/);
assert.match(reading.advice,/오늘은/);

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/id="daily-fortune-open"/);
assert.match(html,/id="daily-fortune-dialog"/);
assert.match(html,/id="daily-fortune-card"/);
assert.match(html,/src="tarot-data\.js"/);
assert.match(html,/src="daily-fortune\.js"/);
assert.match(html,/href="daily-fortune\.css"/);

console.log('daily Major Arcana fortune regression passed');
