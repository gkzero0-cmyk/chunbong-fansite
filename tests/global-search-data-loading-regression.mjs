import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const shell = read('site-shell.js');
const search = read('site-search.js');
const searchCss = read('site-search.css');
const sw = read('service-worker.js');
const dataHtml = read('data.html');
const dataCss = read('data.css');
const dataCore = read('data-core.js');

assert.match(shell, /site-search\.css/);
assert.match(shell, /site-search\.js/);
assert.match(search, /event\.ctrlKey\|\|event\.metaKey/);
assert.match(search, /fetchJson\('activity'\)/);
assert.match(search, /fetchJson\('schedule'\)/);
assert.match(search, /춘봉 방송 이력/);
assert.match(search, /춘봉 데이터/);
assert.match(searchCss, /site-search-dialog/);
assert.match(searchCss, /@media\(max-width:760px\)/);
assert.match(sw, /site-search\.css/);
assert.match(sw, /site-search\.js/);
assert.match(dataHtml, /YouTube 변화 데이터를 불러오는 중/);
assert.match(dataHtml, /월별 그래프를 계산하는 중/);
assert.match(dataCss, /@keyframes dataLoadingSweep/);
assert.match(dataCss, /prefers-reduced-motion/);
assert.match(dataCore, /function renderInitialLoadFailure/);
assert.match(dataCore, /if\(!state\.payload\) renderInitialLoadFailure\(\)/);

console.log('global search and data loading regression passed');
