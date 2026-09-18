import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../chuncortile-ranking-core.js');

assert.deepEqual(Core.validateNickname('춘봉 1호'),{ok:true,displayName:'춘봉 1호',key:'춘봉 1호'});
assert.equal(Core.validateNickname('!').ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉A',score:120,maxCombo:7,misses:2}).ok,true);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉A',score:201,maxCombo:7,misses:2}).error,'invalid_score');
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉A',score:120,maxCombo:-1,misses:2}).error,'invalid_combo');

const rows=[
  {displayName:'A',score:100,maxCombo:3,misses:1,achievedAt:'2026-09-19T00:00:03Z'},
  {displayName:'B',score:120,maxCombo:2,misses:4,achievedAt:'2026-09-19T00:00:02Z'},
  {displayName:'C',score:120,maxCombo:5,misses:5,achievedAt:'2026-09-19T00:00:01Z'},
  {displayName:'D',score:120,maxCombo:5,misses:1,achievedAt:'2026-09-19T00:00:04Z'}
];
assert.deepEqual(Core.sortRecords('classic',rows).map(x=>x.displayName),['D','C','B','A']);
assert.equal(Core.isBetterRecord('classic',{score:120,maxCombo:5,misses:0,achievedAt:'2026-09-19T00:00:05Z'},rows[2]),true);
console.log('chuncortile ranking regression passed');