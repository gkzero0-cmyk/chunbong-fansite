import fs from 'node:fs';
import assert from 'node:assert/strict';
const js=fs.readFileSync(new URL('../chunbak.js',import.meta.url),'utf8');
for(const token of ["const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking'",'Matter.Engine.create','Matter.Bodies.circle','collisionStart','Core.mergeResult','Core.pickSpawnStage','Core.updateDangerState','requestAnimationFrame','pointermove','pointerdown','localStorage']) assert.ok(js.includes(token), `missing ${token}`);
assert.ok(js.includes('Matter.World.remove(world, a);'), 'merged body A must be removed individually');
assert.ok(js.includes('Matter.World.remove(world, b);'), 'merged body B must be removed individually');
assert.equal(js.includes('Matter.World.remove(world, [a, b]);'), false, 'Matter.World.remove does not accept an array of bodies');
console.log('chunbak runtime source regression passed');
