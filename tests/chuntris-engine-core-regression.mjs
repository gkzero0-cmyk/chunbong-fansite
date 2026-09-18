import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PIECE_TYPES,
  createSevenBag,
  createEmptyBoard,
  ghostY,
  gravityMs,
  lockDelayMs,
  ChuntrisGame
} = require('../chuntris-engine.js');

const bag = createSevenBag(() => 0.42);
assert.equal(bag.length, 7);
assert.deepEqual([...bag].sort(), [...PIECE_TYPES].sort());

const board = createEmptyBoard();
assert.equal(board.length, 22);
assert.ok(board.every(row => row.length === 10));

const game = new ChuntrisGame({ mode: 'classic', random: () => 0.42 });
let state = game.getSnapshot();
assert.equal(state.board.length, 22);
assert.equal(state.next.length >= 5, true);
assert.equal(state.status, 'idle');

game.start(0);
state = game.getSnapshot();
assert.equal(state.status, 'playing');
assert.equal(Number.isFinite(ghostY(state.board, state.active)), true);
assert.equal(gravityMs(1, 'classic'), 1000);
assert.equal(gravityMs(99, 'classic'), 80);
assert.equal(gravityMs(99, 'sprint40'), 1000);
assert.equal(gravityMs(1, 'hard'), 420);
assert.equal(gravityMs(99, 'hard'), 45);
assert.equal(lockDelayMs('hard'), 300);
assert.equal(lockDelayMs('classic'), 500);
const hard = new ChuntrisGame({ mode:'hard', random:()=>0.42 });
assert.equal(hard.getSnapshot().mode,'hard');

console.log('chuntris engine core regression passed');
