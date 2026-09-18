import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../chuntris.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../chuntris.js',import.meta.url),'utf8');
const postgameJs=fs.readFileSync(new URL('../chuntris-postgame-ranking.js',import.meta.url),'utf8');

for(const token of ['id="chuntris-modal"','id="chuntris-ranking"','data-chuntris-panel="ranking"','id="chuntris-ranking-status"','id="chuntris-ranking-list"','data-chuntris-ranking-mode="classic"','data-chuntris-ranking-mode="sprint40"','data-chuntris-ranking-mode="score180"','data-chuntris-ranking-difficulty="normal"','data-chuntris-ranking-difficulty="hard"','data-chuntris-ranking-difficulty="extreme"','chuntris-hold-panel','chuntris-next-panel','id="chuntris-ranking-nickname"']) assert.ok(html.includes(token),token);
assert.equal(html.includes('data-chuntris-ranking-mode="hard"'),false,'hard must be a ranking difficulty, not a mode');
assert.equal(html.includes('id="chuntris-nickname"'),false);
assert.ok(html.indexOf('chuntris-ranking-core.js')<html.indexOf('chuntris.js'));
assert.ok(html.indexOf('chuntris.js')<html.indexOf('chuntris-postgame-ranking.js'));
for(const token of ["const NICKNAME_KEY = 'chuntris.nickname.v1'","const RANKING_ENDPOINT = '/api/content?type=chuntris-ranking'",'rankingDifficultyButtons','difficulty','loadRanking','submitRanking'])assert.ok(js.includes(token),token);
for(const token of ["const endpoint='/api/content?type=chuntris-ranking'",'submitTerminalRanking','data-difficulty'])assert.ok(postgameJs.includes(token),token);
assert.equal(js.includes('innerHTML = entry.nickname'),false);
assert.ok(js.includes('.textContent'));
console.log('Chuntris ranking UI regression passed');
