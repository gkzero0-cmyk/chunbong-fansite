import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const hub = fs.readFileSync(new URL('../minigames.html', import.meta.url), 'utf8');
const content = fs.readFileSync(new URL('../content.js', import.meta.url), 'utf8');

assert.ok(home.includes('data-nav="minigames" href="minigames.html">미니게임</a>'));
assert.ok(home.includes('href="minigames.html"'));
assert.ok(home.includes('<strong>미니게임</strong>'));

assert.ok(hub.includes('data-page="minigames"'));
assert.ok(hub.includes('data-nav="minigames" href="minigames.html">미니게임</a>'));
assert.ok(hub.includes('href="chuntris.html"'));
assert.ok(hub.includes('href="chunbak.html"'));
assert.ok(hub.includes('춘트리스'));
assert.ok(hub.includes('춘박게임'));

assert.ok(content.includes("nav?.querySelector('[data-nav=\"chuntris\"]')"));
assert.ok(content.includes("chuntrisLink.dataset.nav = 'minigames'"));
assert.ok(content.includes("chuntrisLink.href = 'minigames.html'"));
assert.ok(content.includes("chuntrisLink.textContent = '미니게임'"));
assert.ok(content.includes("document.body.dataset.page === 'chuntris'"));
assert.ok(content.includes("document.body.dataset.page = 'minigames'"));

console.log('minigames navigation regression passed');
