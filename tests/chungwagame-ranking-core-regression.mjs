import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../chungwagame-ranking-core.js');
const valid=Core.validateRecord({mode:'classic',nickname:'춘봉',score:120,maxCombo:5,cleared:62});
assert.equal(valid.ok,true);
assert.equal(Core.validateNickname('x').ok,false);
assert.equal(Core.validateNickname('춘봉<script>').ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:-1,maxCombo:1,cleared:2}).ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:1,maxCombo:1000,cleared:2}).ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:1,maxCombo:1,cleared:171}).ok,false);
assert.deepEqual(Core.sortRecords('classic',[
 {displayName:'B',score:100,maxCombo:4,cleared:50,achievedAt:'2026-09-18T00:00:02.000Z'},
 {displayName:'A',score:120,maxCombo:2,cleared:40,achievedAt:'2026-09-18T00:00:03.000Z'},
 {displayName:'C',score:100,maxCombo:5,cleared:41,achievedAt:'2026-09-18T00:00:03.000Z'},
 {displayName:'D',score:100,maxCombo:5,cleared:48,achievedAt:'2026-09-18T00:00:01.000Z'}
]).map(v=>v.displayName),['A','D','C','B']);
console.log('Chungwagame ranking core regression passed');
