import fs from 'node:fs';
import assert from 'node:assert/strict';
const yml=fs.readFileSync(new URL('../.github/workflows/chunbak-production-smoke.yml',import.meta.url),'utf8');
for(const token of [
  'chunbak.html','minigames.html','assets/chunbak/$n.png','type=chunbak-ranking','1440','390','playwright',
  'id="chunbak-start-view"','id="chunbak-play-view"','id="chunbak-pause"','id="chunbak-fx-layer"','id="chunbak-combo"',
  'id="chunbak-ranking-register"','id="chunbak-ranking-nickname"','function pauseGame','function showMergeEffect',
  'ChunbakGame.createPiece(1','ChunbakGame.showCombo(2','ChunbakGame.setGameOver()','scoreBefore','nextBefore','data-chunbak-action="resume"'
]) assert.ok(yml.includes(token), `missing ${token}`);
assert.ok(yml.includes("page.locator('#chunbak-nickname').count(),0"),'production must assert pre-game nickname is removed');
console.log('chunbak production smoke source regression passed');
