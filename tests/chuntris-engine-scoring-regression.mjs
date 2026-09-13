import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { scoreClear, gravityMs, createEmptyBoard, ChuntrisGame } = require('../chuntris-engine.js');

assert.equal(scoreClear({ lines: 1, tSpin: false, level: 2, combo: -1, backToBack: false }).points, 200);
assert.equal(scoreClear({ lines: 4, tSpin: false, level: 1, combo: -1, backToBack: false }).points, 800);
assert.equal(scoreClear({ lines: 2, tSpin: true, level: 1, combo: -1, backToBack: false }).points, 1200);
const b2b = scoreClear({ lines: 4, tSpin: false, level: 1, combo: 0, backToBack: true });
assert.equal(b2b.b2bApplied, true);
assert.ok(b2b.points > 800);
const combo = scoreClear({ lines: 1, tSpin: false, level: 1, combo: 0, backToBack: false });
assert.equal(combo.nextCombo, 1);
assert.equal(combo.points, 150);
assert.equal(gravityMs(11, 'classic') < gravityMs(1, 'classic'), true);

const sprint = new ChuntrisGame({ mode: 'sprint40', random: () => 0.3 });
sprint.start(100);
sprint.state.lines = 39;
sprint.applyClearEvent({ lines: 1, tSpin: false }, 12345);
assert.equal(sprint.getSnapshot().status, 'completed');
assert.equal(sprint.getSnapshot().lines, 40);
assert.equal(sprint.getSnapshot().elapsedMs, 12245);

const tSpinDrop = new ChuntrisGame({ mode: 'classic', random: () => 0.2 });
tSpinDrop.start(0);
tSpinDrop.state.board = createEmptyBoard();
tSpinDrop.state.active = { type: 'T', rotation: 0, x: 3, y: 19 };
tSpinDrop.state.board[19][3] = 'J';
tSpinDrop.state.board[19][5] = 'J';
tSpinDrop.state.board[21][3] = 'J';
tSpinDrop.state.lastAction = 'rotate';
assert.equal(tSpinDrop.hardDrop(100), 0, 'landed T piece should lock without moving');
const tSpinState = tSpinDrop.getSnapshot();
assert.equal(tSpinState.lastClear?.tSpin, true, 'hard drop must preserve a qualifying final rotation for T-Spin detection');
assert.equal(tSpinState.score, 400, 'zero-line T-Spin should award its base score');

console.log('chuntris scoring regression passed');
