import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const marker of ['modalAutoPaused','openUtilityModal','closeUtilityModal','openPauseMenu','continueGame','returnToStartForNewGame']) assert.ok(source.includes(marker), marker);
assert.ok(source.includes("if (state.status === 'playing')"), 'utility modal must detect active play');
assert.ok(source.includes('modalAutoPaused = true'), 'utility modal must remember auto-pause');
assert.ok(source.includes('if (modalAutoPaused'), 'close must resume only auto-paused games');
console.log('chuntris modal pause regression passed');
