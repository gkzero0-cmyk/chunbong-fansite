import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');

const startView = html.match(/<section id="chuntris-start-view"[\s\S]*?<section id="chuntris-play-view"/)?.[0] || '';
assert.ok(startView, 'Chuntris start view must exist');
assert.ok(!startView.includes('id="chuntris-nickname"'), 'pre-game start view must not ask for a nickname');
assert.ok(startView.includes('id="chuntris-start"'), 'mode selection must still expose an immediate game start button');

for (const id of ['chuntris-ranking-register','chuntris-ranking-submit-panel','chuntris-ranking-nickname','chuntris-ranking-submit','chuntris-ranking-cancel','chuntris-overlay-restart']) {
  assert.ok(html.includes(`id="${id}"`), `terminal ranking/retry UI missing: ${id}`);
}
assert.ok(html.includes('랭킹 등록'), 'terminal overlay must offer explicit ranking registration');
assert.ok(html.includes('등록하기') && html.includes('취소'), 'terminal nickname panel must offer submit/cancel choices');

assert.ok(!js.includes("if(previousStatus!==state.status&&((mode==='classic'&&state.status==='gameover')||(mode==='sprint40'&&state.status==='completed')))void submitRanking(state);"), 'terminal transition must not auto-submit global ranking');
assert.ok(js.includes('function openTerminalRankingRegistration()'), 'terminal ranking registration must be explicit');
assert.ok(js.includes('function submitTerminalRanking()'), 'terminal ranking submit handler must exist');
assert.ok(js.includes("els.rankingRegister?.addEventListener('click',openTerminalRankingRegistration)"), 'ranking registration button must be wired');
assert.ok(js.includes("els.rankingSubmit?.addEventListener('click',()=>void submitTerminalRanking())"), 'ranking submit button must be wired');
assert.ok(js.includes("els.rankingCancel?.addEventListener('click',closeTerminalRankingRegistration)"), 'ranking cancel button must be wired');

assert.ok(css.includes('--chuntris-shell-bg'), 'start/play UI must share a Chuntris shell surface token');
assert.ok(css.includes('.chuntris-terminal-actions'), 'terminal actions must have unified game UI styling');
assert.ok(css.includes('.chuntris-ranking-submit-panel'), 'post-game nickname panel must be styled');

console.log('Chuntris post-game ranking UI regression passed');
