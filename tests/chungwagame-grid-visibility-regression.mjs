import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chungwagame.css', import.meta.url), 'utf8');

assert.match(
  css,
  /\.cg-board\{[\s\S]*background-image:[\s\S]*linear-gradient\(to right,[\s\S]*linear-gradient\(to bottom,[\s\S]*background-size:calc\(100% \/ 17\) 100%,100% calc\(100% \/ 10\)/,
  '춘과게임 격자는 보드 배경에서 정확한 17×10 간격으로 그려져야 합니다.'
);

assert.match(
  css,
  /\.cg-fruit\{[\s\S]*border:0!important;[\s\S]*background:transparent!important/,
  '셀 테두리가 과일 중심을 밀어내지 않아야 합니다.'
);

assert.match(
  css,
  /\.cg-fruit-shape\{[\s\S]*width:84%!important;[\s\S]*height:auto!important;[\s\S]*aspect-ratio:1\/1/,
  '춘과 이미지는 셀 정중앙의 정사각형 영역에 배치되어야 합니다.'
);

assert.match(
  css,
  /\.cg-fruit-shape::after\{[\s\S]*content:attr\(data-value\);[\s\S]*color:#fffdf2/,
  '숫자는 단색의 간결한 오버레이로 표시되어야 합니다.'
);

assert.doesNotMatch(
  css,
  /\.cg-fruit\.empty\{opacity:0;transform:scale\(\.3\)\}/,
  '빈 칸 자체를 투명하게 만들어 격자가 사라지는 이전 스타일이 남아 있으면 안 됩니다.'
);

console.log('Chungwagame grid visibility regression passed');
