import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../chunbak-game-core.js');

let state = Core.updateDangerTracker({}, [101], 1000, 2000);
assert.deepEqual(state.startedAtById, {101:1000});
assert.equal(state.gameOver, false);

// A different body replacing the first one must start its own timer.
state = Core.updateDangerTracker(state.startedAtById, [202], 2500, 2000);
assert.deepEqual(state.startedAtById, {202:2500});
assert.equal(state.gameOver, false);

// The same body continuously above the line for 2 seconds triggers game over.
state = Core.updateDangerTracker(state.startedAtById, [202], 4500, 2000);
assert.equal(state.gameOver, true);

// Bodies that drop below the line are removed from the tracker.
state = Core.updateDangerTracker(state.startedAtById, [], 4600, 2000);
assert.deepEqual(state.startedAtById, {});
assert.equal(state.gameOver, false);

console.log('chunbak per-body danger tracker regression passed');
