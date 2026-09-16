import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chunbak-ranking-core.js');
const valid=Core.validateRecord({mode:'classic',nickname:'춘봉',score:1200,maxLevel:8});
assert.equal(valid.ok,true);
assert.equal(Core.validateNickname('a').ok,false);
assert.equal(Core.validateNickname('춘봉<script>').ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:-1,maxLevel:8}).ok,false);
assert.equal(Core.validateRecord({mode:'classic',nickname:'춘봉',score:100,maxLevel:12}).ok,false);
assert.equal(Core.isBetterRecord('classic',{score:200,maxLevel:5,achievedAt:'2026-09-17T00:00:02.000Z'},{score:200,maxLevel:4,achievedAt:'2026-09-17T00:00:01.000Z'}),true);
assert.deepEqual(Core.sortRecords('classic',[
 {displayName:'B',score:100,maxLevel:5,achievedAt:'2026-09-17T00:00:02.000Z'},
 {displayName:'A',score:200,maxLevel:2,achievedAt:'2026-09-17T00:00:03.000Z'},
 {displayName:'C',score:100,maxLevel:6,achievedAt:'2026-09-17T00:00:03.000Z'},
 {displayName:'D',score:100,maxLevel:6,achievedAt:'2026-09-17T00:00:01.000Z'}
]).map(v=>v.displayName),['A','D','C','B']);
console.log('chunbak ranking core regression passed');
