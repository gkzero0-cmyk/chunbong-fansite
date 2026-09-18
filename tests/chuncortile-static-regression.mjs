import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chuncortile.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../chuncortile.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../chuncortile.js',import.meta.url),'utf8');
const hub=fs.readFileSync(new URL('../minigames.html',import.meta.url),'utf8');
const content=fs.readFileSync(new URL('../content.js',import.meta.url),'utf8');

assert.doesNotThrow(()=>new Function(js));
assert.match(html,/<h1>춘컬타일<\/h1>/);
assert.match(html,/id="ct-board"/);
assert.match(html,/상·하·좌·우/);
assert.match(html,/-10초/);
assert.match(html,/chuncortile-core\.js/);
assert.match(css,/grid-template-columns:repeat\(25,minmax\(0,1fr\)\)/);
assert.match(css,/assets\/chuncortile\/tiles\.png/);
for(let i=1;i<=11;i++)assert.match(css,new RegExp('\\.ct-face-'+i+'\\{background-position:'),'tile sprite position missing '+i);
assert.match(js,/MISS_PENALTY_MS/);
assert.match(js,/Core\.findAnyMove/);
assert.match(js,/Core\.applyClick/);
assert.match(hub,/href="chuncortile\.html"/,'minigames hub card missing');
assert.match(hub,/>춘컬타일</);
assert.match(content,/href="chuncortile\.html"/,'header submenu link missing');
console.log('chuncortile static regression passed');