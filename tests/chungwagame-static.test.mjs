import fs from 'node:fs';
import assert from 'node:assert/strict';

const gameHtml=fs.readFileSync(new URL('../chungwagame.html', import.meta.url), 'utf8');
const minigamesHtml=fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');

assert.match(minigamesHtml, /href="chungwagame\.html"/, 'minigames must link Chungwagame');
assert.match(minigamesHtml, /<strong>춘과게임<\/strong>/, 'minigames must label Chungwagame');
assert.match(gameHtml, /GAME_SECONDS=120/, 'Chungwagame must keep the 120 second timer');
assert.match(gameHtml, /assets\/chungwagame\/numbers\.webp/, 'number sprite must be referenced');
assert.match(gameHtml, /shape\.dataset\.value=String\(cell\.value\)/, 'fruit cells must select sprite tile by value');
assert.doesNotMatch(gameHtml, /shape\.textContent=String\(cell\.value\)/, 'CSS placeholder number rendering must not return');

const ids=[...gameHtml.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(ids).size, ids.length, 'duplicate IDs found in Chungwagame');

for (const id of ['cg-board','cg-start','cg-hint-btn','cg-shuffle','cg-pause','cg-sound','cg-restart','cg-over-overlay']) {
  assert.ok(ids.includes(id), `required Chungwagame element missing: ${id}`);
}

const inlineScripts=[...gameHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
assert.ok(inlineScripts.length, 'Chungwagame inline game script missing');
new Function(inlineScripts.at(-1));

console.log('Chungwagame static regression passed');
