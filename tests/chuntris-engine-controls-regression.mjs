import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { ChuntrisGame } = require('../chuntris-engine.js');

const game = new ChuntrisGame({ mode: 'classic', random: () => 0.2 });
game.start(0);
const first = game.getSnapshot();
assert.equal(game.moveHorizontal(-1), true);
assert.equal(typeof game.rotate(1), 'boolean');
assert.equal(game.holdPiece(), true);
assert.equal(game.holdPiece(), false, 'hold must be limited to once before lock');

const scoreBeforeDrop = game.getSnapshot().score;
const moved = game.hardDrop();
assert.ok(moved >= 0);
assert.equal(game.getSnapshot().score, scoreBeforeDrop + moved * 2);
assert.equal(game.getSnapshot().canHold, true, 'hold resets after lock');

const pauseGame = new ChuntrisGame({ mode: 'classic', random: () => 0.4 });
pauseGame.start(0);
const y0 = pauseGame.getSnapshot().active.y;
pauseGame.advance(1000);
const advanced = pauseGame.getSnapshot();
assert.ok(advanced.active.y > y0 || advanced.status === 'gameover');
assert.ok(first.next.length >= 5);

console.log('chuntris controls regression passed');
