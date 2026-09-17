import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const marker of ['modalAutoPaused','openUtilityModal','closeUtilityModal','openPauseMenu','continueGame','returnToStartForNewGame']) assert.ok(source.includes(marker), marker);
assert.ok(source.includes("if (state.status === 'playing')"), 'utility modal must detect active play');
assert.ok(source.includes('modalAutoPaused = true'), 'utility modal must remember auto-pause');
assert.ok(source.includes('const shouldResume=modalAutoPaused') || source.includes('const shouldResume = modalAutoPaused'), 'close must preserve auto-pause state before clearing it');
assert.ok(source.includes('if (shouldResume &&') || source.includes('if (modalAutoPaused &&'), 'close must resume only from the preserved auto-pause guard');
console.log('chuntris modal pause regression passed');
