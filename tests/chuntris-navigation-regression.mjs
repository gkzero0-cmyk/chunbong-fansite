import fs from 'node:fs';
import assert from 'node:assert/strict';

const pages = ['index','schedule','notice','vod','clips','fanart','tarot','youtube','data','history','chuntris','minigames'];
const hubLink = 'data-nav="minigames" href="minigames.html">미니게임</a>';
const legacyLink = 'data-nav="chuntris" href="chuntris.html">춘트리스</a>';

for (const page of pages) {
  const html = fs.readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  assert.ok(html.includes(hubLink), `${page}.html must link to the minigames hub in main navigation`);
  assert.equal(html.includes(legacyLink), false, `${page}.html must not expose legacy direct Chuntris navigation`);
}

const hub = fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');
assert.ok(hub.includes('href="chuntris.html"'), 'Minigames hub must preserve the chuntris.html URL');

const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="minigames"'), 'Chuntris page must activate the Minigames navigation state');

console.log('chuntris navigation regression passed');
