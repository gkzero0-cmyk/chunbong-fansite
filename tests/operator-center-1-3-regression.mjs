import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const api=read('lib/operator-center-api.js');

assert.match(html,/전체 페이지뷰 중 비중/,'page ranking basis must be explicit');
assert.match(html,/전체 메뉴 클릭 중 비중/,'menu ranking basis must be explicit');
assert.match(html,/기능과 행동 단계를 분리/,'feature action explanation missing');
assert.match(html,/기기 · 실행 방식 · 테마를 서로 다른 기준으로 구분/,'environment grouping explanation missing');

assert.match(js,/contents:'춘봉 콘텐츠'/,'internal contents menu key must have a friendly Korean label');
assert.match(js,/춘박게임MERGE':'춘박게임'/,'legacy merged game menu label must be normalized');
assert.match(js,/function sharePercent/,'share percentage helper missing');
assert.match(js,/function renderFeatureRows/,'feature action renderer missing');
assert.match(js,/게임 시작/,'game start action label missing');
assert.match(js,/게임 종료/,'game finish action label missing');
assert.match(js,/리딩 시작/,'tarot start action label missing');
assert.match(js,/결과 확인/,'tarot result action label missing');
assert.match(js,/function renderEnvironmentRows/,'environment grouping renderer missing');
assert.match(js,/data\.menuTotal/,'menu denominator must come from the full aggregate');
assert.match(js,/data\.featureTotal/,'feature denominator must come from the full aggregate');
assert.match(js,/느린 페이지 감지/,'slow single-page warning missing');

assert.match(api,/const menuTotal=Object\.values\(menus\)/,'menu total aggregation missing');
assert.match(api,/const featureTotal=Object\.values\(features\)/,'feature total aggregation missing');
assert.match(api,/topMenus:topRows\(menus,10\),menuTotal/,'menu total response missing');
assert.match(api,/topFeatures:topRows\(features,14\),featureTotal/,'feature total response missing');

assert.match(css,/Operator Center 1\.3/,'operator center 1.3 style block missing');
assert.match(css,/operator-feature-title/,'feature action visual hierarchy missing');
assert.match(css,/operator-environment-list/,'environment grouped layout missing');

new Function(js);
new Function(api);

console.log('operator center 1.3 readability regression passed');
