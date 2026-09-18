import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../chuncortile-core.js');

assert.equal(Core.COLS,25);
assert.equal(Core.ROWS,18);
assert.equal(Core.TILE_COUNT,200);
assert.equal(Core.TYPE_COUNT,11);
assert.equal(Core.GAME_MS,120000);
assert.equal(Core.MISS_PENALTY_MS,10000);

const randomA=Core.seededRandom(12345),randomB=Core.seededRandom(12345);
const boardA=Core.createBoard({random:randomA}),boardB=Core.createBoard({random:randomB});
assert.deepEqual(boardA,boardB,'same seed must create the same board');
assert.equal(boardA.length,25*18);
assert.equal(Core.remainingTiles(boardA),200);
assert.ok(Core.findAnyMove(boardA),'generated board must contain at least one valid move');

const tiny=Array(25).fill(null);
tiny[11]=4;tiny[13]=4;
assert.deepEqual(Core.findMatch(tiny,12,{cols:5,rows:5}),[11,13]);
const clear=Core.applyClick(tiny,12,{cols:5,rows:5});
assert.equal(clear.removed,2);
assert.equal(clear.board[11],null);
assert.equal(clear.board[13],null);

const missBoard=Array(25).fill(null);
missBoard[10]=1;missBoard[14]=2;
const miss=Core.applyClick(missBoard,12,{cols:5,rows:5});
assert.equal(miss.miss,true);
assert.equal(miss.removed,0);
const ignored=Core.applyClick([0,null,null],0,{cols:3,rows:1});
assert.equal(ignored.ignored,true);
assert.equal(ignored.miss,false);

console.log('chuncortile core regression passed');