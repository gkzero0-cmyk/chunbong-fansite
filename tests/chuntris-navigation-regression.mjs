import fs from 'node:fs';
import assert from 'node:assert/strict';

const chuntris = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
assert.ok(chuntris.includes('data-page="minigames"'), 'Chuntris page must activate the minigame navigation state');
assert.ok(chuntris.includes('data-nav="minigames" href="minigames.html">미니게임</a>'), 'Chuntris page must route through the minigame hub');
assert.ok(chuntris.includes('id="chuntris-game"'), 'Chuntris game URL and shell must remain intact');
assert.ok(chuntris.includes('src="chuntris-engine.js"'));
assert.ok(chuntris.includes('src="chuntris.js"'));

console.log('chuntris navigation regression passed');
