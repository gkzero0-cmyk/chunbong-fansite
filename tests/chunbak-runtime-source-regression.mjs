import fs from 'node:fs';
import assert from 'node:assert/strict';
const js=fs.readFileSync(new URL('../chunbak.js',import.meta.url),'utf8');
for(const token of ["const RANKING_ENDPOINT = '/api/content?type=chunbak-ranking'",'Matter.Engine.create','Matter.Bodies.circle','collisionStart','Core.mergeResult','Core.pickSpawnStage','Core.updateDangerState','requestAnimationFrame','pointermove','pointerdown','localStorage']) assert.ok(js.includes(token), `missing ${token}`);
console.log('chunbak runtime source regression passed');
