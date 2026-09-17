import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const legacyJs = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const postgameJs = fs.readFileSync(new URL('../chuntris-postgame-ranking.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris-vcompany-ui.css', import.meta.url), 'utf8');

const startView = html.match(/<section id="chuntris-start-view"[\s\S]*?<section id="chuntris-play-view"/)?.[0] || '';
assert.ok(startView, 'Chuntris start view must exist');
assert.ok(!startView.includes('id="chuntris-nickname"'), 'pre-game start view must not ask for a nickname');
assert.ok(!html.includes('id="chuntris-nickname"'), 'legacy pre-game nickname input must be removed entirely');
assert.ok(startView.includes('id="chuntris-start"'), 'mode selection must still expose an immediate game start button');

for (const id of ['chuntris-ranking-register','chuntris-ranking-submit-panel','chuntris-ranking-nickname','chuntris-ranking-submit','chuntris-ranking-cancel','chuntris-overlay-restart']) {
  assert.ok(html.includes(`id="${id}"`), `terminal ranking/retry UI missing: ${id}`);
}
assert.ok(html.includes('랭킹 등록'), 'terminal overlay must offer explicit ranking registration');
assert.ok(html.includes('등록하기') && html.includes('취소'), 'terminal nickname panel must offer submit/cancel choices');
assert.ok(html.includes('chuntris-vcompany-ui.css') && html.includes('chuntris-postgame-ranking.js'), 'new UI and postgame controller assets must be loaded');

assert.ok(legacyJs.includes("if (!nickname || typeof fetch !== 'function') return;"), 'legacy auto-submit path must be a no-op without a pre-game nickname element');
assert.ok(postgameJs.includes('function openTerminalRankingRegistration()'), 'terminal ranking registration must be explicit');
assert.ok(postgameJs.includes('async function submitTerminalRanking()'), 'terminal ranking submit handler must exist');
assert.ok(postgameJs.includes("registerButton.addEventListener('click', openTerminalRankingRegistration)"), 'ranking registration button must be wired');
assert.ok(postgameJs.includes("submitButton.addEventListener('click', () => void submitTerminalRanking())"), 'ranking submit button must be wired');
assert.ok(postgameJs.includes("cancelButton.addEventListener('click', closeTerminalRankingRegistration)"), 'ranking cancel button must be wired');
assert.ok(postgameJs.includes("localStorage.setItem") || postgameJs.includes('storageSet(nicknameKey'), 'successful ranking registration must remember the chosen nickname');

assert.ok(css.includes('--chuntris-shell-bg'), 'start/play UI must share a Chuntris shell surface token');
assert.ok(css.includes('.chuntris-terminal-actions'), 'terminal actions must have unified game UI styling');
assert.ok(css.includes('.chuntris-ranking-submit-panel'), 'post-game nickname panel must be styled');
assert.ok(css.includes('.chuntris-layout-immersive .chuntris-panel'), 'gameplay panels must use the same visual shell as mode selection');

console.log('Chuntris post-game ranking UI regression passed');
