import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../chuntris-ranking-core.js');

assert.equal(Core.normalizeNickname('  춘   봉  '),'춘 봉');
assert.equal(Core.validateNickname('춘봉_01').ok,true);
assert.equal(Core.validateNickname('a').ok,false);
assert.equal(Core.normalizeConfig('hard').mode,'classic');
assert.equal(Core.normalizeConfig('hard').difficulty,'hard');
assert.equal(Core.normalizeConfig('score180','extreme').mode,'score180');
assert.equal(Core.normalizeConfig('score180','extreme').difficulty,'extreme');

assert.equal(Core.validateRecord({mode:'classic',difficulty:'normal',nickname:'춘봉',score:1000,lines:10,level:2,timeMs:60000}).ok,true);
assert.equal(Core.validateRecord({mode:'classic',difficulty:'hard',nickname:'춘봉',score:1300,lines:12,level:3,timeMs:50000}).ok,true);
assert.equal(Core.validateRecord({mode:'classic',difficulty:'extreme',nickname:'춘봉',score:1400,lines:12,level:4,timeMs:50000}).ok,true);
assert.equal(Core.validateRecord({mode:'sprint40',difficulty:'normal',nickname:'춘봉',score:8000,lines:39,level:1,timeMs:90000}).ok,false);
assert.equal(Core.validateRecord({mode:'sprint40',difficulty:'extreme',nickname:'춘봉',score:8000,lines:40,level:4,timeMs:90000}).ok,true);
assert.equal(Core.validateRecord({mode:'score180',difficulty:'hard',nickname:'춘봉',score:9000,lines:35,level:6,timeMs:180000}).ok,true);

assert.equal(Core.isBetterRecord('classic',{score:200,lines:2,achievedAt:'2026-09-14T00:00:02.000Z'},{score:100,lines:8,achievedAt:'2026-09-14T00:00:01.000Z'}),true);
assert.equal(Core.isBetterRecord('sprint40',{timeMs:80000,score:1000,achievedAt:'2026-09-14T00:00:02.000Z'},{timeMs:90000,score:9000,achievedAt:'2026-09-14T00:00:01.000Z'}),true);
assert.equal(Core.isBetterRecord('score180',{score:5000,lines:20,timeMs:180000,achievedAt:'2026-09-14T00:00:02.000Z'},{score:4000,lines:30,timeMs:180000,achievedAt:'2026-09-14T00:00:01.000Z'}),true);
assert.deepEqual(Core.sortRecords('classic',[
  {displayName:'B',score:100,lines:5,achievedAt:'2026-09-14T00:00:02.000Z'},
  {displayName:'A',score:200,lines:1,achievedAt:'2026-09-14T00:00:03.000Z'},
  {displayName:'C',score:100,lines:6,achievedAt:'2026-09-14T00:00:01.000Z'}
]).map(v=>v.displayName),['A','C','B']);
assert.equal(Core.formatTime(91321),'01:31.321');
console.log('Chuntris ranking core regression passed');
