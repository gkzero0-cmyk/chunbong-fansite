import fs from 'node:fs';
import assert from 'node:assert/strict';

const game=fs.readFileSync(new URL('../chunbak.js',import.meta.url),'utf8');
const postgame=fs.readFileSync(new URL('../chunbak-postgame-ranking.js',import.meta.url),'utf8');

assert.ok(game.includes('async function loadRanking'));
assert.ok(game.includes("fetch(`${RANKING_ENDPOINT}&mode=classic`"));
assert.ok(game.includes('랭킹을 불러올 수 없습니다'));
assert.equal(game.includes('async function submitRanking'),false,'game runtime must not submit ranking automatically');
assert.equal(game.includes('chunbak:nickname:v1'),false,'game runtime must not own nickname persistence');

assert.ok(postgame.includes('async function submitTerminalRanking'));
assert.ok(postgame.includes("const nicknameKey = 'chunbak:nickname:v1'"));
assert.ok(postgame.includes('닉네임은 한글/영문/숫자 기준 2~16자로 입력해 주세요.'));
assert.ok(postgame.includes('랭킹 등록에 실패했습니다. 로컬 최고 기록은 그대로 유지됩니다.'));
assert.ok(postgame.includes("root.dataset.gameStatus === 'gameover'"));
assert.ok(postgame.includes("document.getElementById('chunbak-ranking-modal-list')"));
assert.ok(postgame.includes("document.getElementById('chunbak-ranking-modal-status')"));

console.log('chunbak ranking ui regression passed');
