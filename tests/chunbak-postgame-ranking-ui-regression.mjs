import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
const postgame = fs.existsSync(new URL('../chunbak-postgame-ranking.js', import.meta.url))
  ? fs.readFileSync(new URL('../chunbak-postgame-ranking.js', import.meta.url), 'utf8')
  : '';

assert.equal(html.includes('id="chunbak-nickname"'), false, 'Chunbak must not ask for nickname before play');
for (const id of ['chunbak-ranking-register','chunbak-ranking-submit-panel','chunbak-ranking-nickname','chunbak-ranking-submit','chunbak-ranking-cancel']) {
  assert.ok(html.includes(`id="${id}"`), `postgame ranking UI missing: ${id}`);
}
assert.ok(html.includes('랭킹 등록'), 'game-over overlay must offer explicit ranking registration');
assert.ok(html.includes('등록하기') && html.includes('취소'), 'postgame nickname panel must offer submit/cancel');
assert.ok(html.includes('chunbak-postgame-ranking.js'), 'postgame ranking controller must be loaded');

assert.equal(js.includes('void submitRanking();'), false, 'game over must not automatically submit global ranking');
assert.ok(js.includes("localStorage.setItem(BEST_KEY, String(best))"), 'local BEST must still persist automatically');
assert.ok(postgame.includes('submitTerminalRanking'), 'explicit Chunbak ranking submit handler must exist');
assert.ok(postgame.includes("/api/content?type=chunbak-ranking"), 'explicit submit must use the existing ranking endpoint');
assert.ok(postgame.includes("chunbak:nickname:v1"), 'successful nickname may be remembered for future registration convenience');

console.log('Chunbak post-game ranking UI regression passed');
