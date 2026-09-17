import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const marker of ["'start-mode'","'start-player'","'playing'","'paused'","'terminal'",'setViewState']) assert.ok(source.includes(marker), marker);
assert.ok(source.includes("if (!raw.trim()) return null"), 'blank nickname must be accepted as local-only');
assert.ok(source.includes('if (!nickname || typeof fetch'), 'ranking submit must skip blank nickname');
assert.ok(!source.includes("닉네임은 한글/영문/숫자/공백/_/- 조합으로 2~16자 입력해 주세요"), 'blank nickname must not block start');
console.log('chuntris flow regression passed');
