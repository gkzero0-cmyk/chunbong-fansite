import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {
  PIECE_TYPES,createSevenBag,createEmptyBoard,ghostY,gravityMs,lockDelayMs,levelForLines,
  normalizeMode,normalizeDifficulty,SCORE_ATTACK_MS,EXTREME_GIMMICK_INTERVAL_MS,extremeGimmickForSlot,injectGarbageRow,ChuntrisGame
}=require('../chuntris-engine.js');

const bag=createSevenBag(()=>0.42);
assert.equal(bag.length,7);
assert.deepEqual([...bag].sort(),[...PIECE_TYPES].sort());

const board=createEmptyBoard();
assert.equal(board.length,22);
assert.ok(board.every(row=>row.length===10));

const game=new ChuntrisGame({mode:'classic',difficulty:'normal',random:()=>0.42});
let state=game.getSnapshot();
assert.equal(state.mode,'classic');
assert.equal(state.difficulty,'normal');
assert.equal(state.status,'idle');
game.start(0);
state=game.getSnapshot();
assert.equal(state.status,'playing');
assert.equal(Number.isFinite(ghostY(state.board,state.active)),true);

assert.equal(normalizeMode('score180'),'score180');
assert.equal(normalizeDifficulty('extreme'),'extreme');
assert.equal(gravityMs(1,'classic','normal'),1000);
assert.equal(gravityMs(99,'classic','normal'),80);
assert.equal(gravityMs(1,'sprint40','normal'),1000);
assert.equal(gravityMs(1,'classic','hard'),420);
assert.equal(gravityMs(99,'classic','hard'),45);
assert.equal(gravityMs(1,'classic','extreme'),220);
assert.equal(gravityMs(99,'classic','extreme'),18);
assert.equal(lockDelayMs('normal'),500);
assert.equal(lockDelayMs('hard'),300);
assert.equal(lockDelayMs('extreme'),140);
assert.equal(levelForLines(12,'classic','normal'),2);
assert.equal(levelForLines(12,'classic','hard'),3);
assert.equal(levelForLines(12,'classic','extreme'),4);

const legacyHard=new ChuntrisGame({mode:'hard',random:()=>0.42});
assert.equal(legacyHard.getSnapshot().mode,'classic');
assert.equal(legacyHard.getSnapshot().difficulty,'hard');

const scoreAttack=new ChuntrisGame({mode:'score180',difficulty:'normal',random:()=>0.31});
scoreAttack.start(0);
scoreAttack.advance(SCORE_ATTACK_MS);
assert.equal(scoreAttack.getSnapshot().status,'completed');
assert.equal(scoreAttack.getSnapshot().elapsedMs,SCORE_ATTACK_MS);

assert.equal(EXTREME_GIMMICK_INTERVAL_MS,9000);
assert.equal(extremeGimmickForSlot(1),'blink');
assert.equal(extremeGimmickForSlot(2),'phantom');
assert.equal(extremeGimmickForSlot(3),'garbage');
const garbage=injectGarbageRow(createEmptyBoard(),[2,7]);
assert.equal(garbage.board.at(-1)[2],null);
assert.equal(garbage.board.at(-1)[7],null);
assert.equal(garbage.board.at(-1).filter(Boolean).length,8);

console.log('chuntris engine core regression passed');
