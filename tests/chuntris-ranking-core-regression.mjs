import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chuntris-ranking-core.js');

assert.equal(Core.normalizeNickname('  춘   봉  '), '춘 봉');
assert.equal(Core.validateNickname('춘봉_01').ok, true);
assert.equal(Core.validateNickname('a').ok, false);
assert.equal(Core.validateNickname('춘봉<script>').ok, false);
assert.equal(Core.validateNickname('12345678901234567').ok, false);

assert.equal(Core.validateRecord({ mode:'classic', nickname:'춘봉', score:1000, lines:10, level:2, timeMs:60000 }).ok, true);
assert.equal(Core.validateRecord({ mode:'hard', nickname:'춘봉', score:1300, lines:12, level:3, timeMs:50000 }).ok, true);
assert.equal(Core.validateRecord({ mode:'sprint40', nickname:'춘봉', score:8000, lines:39, level:1, timeMs:90000 }).ok, false);
assert.equal(Core.isBetterRecord('classic', {score:200,lines:2,achievedAt:'2026-09-14T00:00:02.000Z'}, {score:100,lines:8,achievedAt:'2026-09-14T00:00:01.000Z'}), true);
assert.equal(Core.isBetterRecord('sprint40', {timeMs:80000,score:1000,achievedAt:'2026-09-14T00:00:02.000Z'}, {timeMs:90000,score:9000,achievedAt:'2026-09-14T00:00:01.000Z'}), true);
assert.equal(Core.isBetterRecord('hard', {score:500,lines:4,achievedAt:'2026-09-14T00:00:02.000Z'}, {score:400,lines:20,achievedAt:'2026-09-14T00:00:01.000Z'}), true);
assert.deepEqual(Core.sortRecords('classic', [
  {displayName:'B',score:100,lines:5,achievedAt:'2026-09-14T00:00:02.000Z'},
  {displayName:'A',score:200,lines:1,achievedAt:'2026-09-14T00:00:03.000Z'},
  {displayName:'C',score:100,lines:6,achievedAt:'2026-09-14T00:00:01.000Z'}
]).map(v => v.displayName), ['A','C','B']);
assert.equal(Core.formatTime(91321), '01:31.321');
console.log('Chuntris ranking core regression passed');
