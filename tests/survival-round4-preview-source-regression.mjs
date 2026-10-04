import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../content-source-card-unifier.js', import.meta.url), 'utf8');

assert.match(
  source,
  /\['208904595',\{round:4,canonicalId:'208904595',previewId:'208904595'/,
  '4차 모집글은 존재하지 않는 자동수집 alias가 아니라 canonical SOOP 원문 208904595에서 미리보기를 읽어야 합니다.'
);

console.log('survival round4 canonical preview source regression passed');
