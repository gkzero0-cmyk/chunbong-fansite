import fs from 'node:fs';
import assert from 'node:assert/strict';

const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris','minigames'];
const minigameLink = 'data-nav="minigames" href="minigames.html">미니게임</a>';

for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(minigameLink), `${page}.html must link to 미니게임`);
  assert.equal(html.includes('data-nav="chuntris" href="chuntris.html">춘트리스</a>'), false, `${page}.html must not expose 춘트리스 as top-level nav`);
}

const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(home.includes('href="minigames.html"'));
assert.ok(home.includes('<strong>미니게임</strong>'));

const hub = fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');
assert.ok(hub.includes('data-page="minigames"'));
assert.ok(hub.includes('href="chuntris.html"'));
assert.ok(hub.includes('href="chunbak.html"'));
assert.ok(hub.includes('춘트리스'));
assert.ok(hub.includes('춘박게임'));

const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="minigames"'));

console.log('minigames navigation regression passed');
