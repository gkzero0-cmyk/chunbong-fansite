import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris','minigames'];
const link = 'data-nav="minigames" href="minigames.html">미니게임</a>';
for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(link), `${page}.html should expose the minigames nav`);
  assert.equal(html.includes('data-nav="chuntris" href="chuntris.html">춘트리스</a>'), false, `${page}.html should not expose the legacy direct Chuntris nav`);
}
const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(home.includes('<strong>미니게임</strong>'));
const hub = fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');
assert.ok(hub.includes('href="chuntris.html"'));
assert.ok(hub.includes('href="chunbak.html"'));
assert.ok(hub.includes('춘트리스') && hub.includes('춘박게임'));
console.log('minigames navigation regression passed');
