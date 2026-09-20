import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chungwagame.css', import.meta.url), 'utf8');

assert.match(
  css,
  /\.cg-fruit\{[^}]*border-right:1px solid rgba\(91,116,25,\.16\);[^}]*border-bottom:1px solid rgba\(91,116,25,\.16\);[^}]*background:rgba\(248,252,232,\.24\)/s,
  '춘과게임 각 칸의 경계선과 기본 셀 배경이 보여야 합니다.'
);

assert.match(
  css,
  /\.cg-fruit\.empty\{opacity:1;transform:none;background:rgba\(232,241,206,\.24\)\}/,
  '제거된 빈 칸에서도 격자가 유지되어야 합니다.'
);

assert.doesNotMatch(
  css,
  /\.cg-fruit\.empty\{opacity:0;transform:scale\(\.3\)\}/,
  '빈 칸 자체를 투명하게 만들어 격자가 사라지는 이전 스타일이 남아 있으면 안 됩니다.'
);

console.log('Chungwagame grid visibility regression passed');
