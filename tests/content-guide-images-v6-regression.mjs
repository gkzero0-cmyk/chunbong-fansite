import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const core=require('../lib/chunbong-content-archive-core');
const archive=require('../lib/chunbong-content-archive-api');
const apiSource=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const archiveSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');

const rawName='||<tablewidth=100%><width=10%><tablebgcolor=#ffffff,#1c1d1f><tablebordercolor=#ffffff,#1c1d1f>"레오펠"은 라틴어로 사자를 뜻하는 "Leo"와 사나운을 뜻하는 "Fel" 에서 유래되었고';
const cleanName=core.cleanGuideText(rawName,'namuwiki');
assert.ok(!/[|]{2}|<tablewidth=|<width=|<tablebgcolor=|<tablebordercolor=/i.test(cleanName),'나무위키 표 문법이 공개 문장에 남으면 안 됩니다');
assert.match(cleanName,/레오펠/,'본문 의미는 유지해야 합니다');

const rawSchedule='레오펠: 사자의 노래 <rowcolor=#fff> 일 월 화 수 목 금 토 <nopad> 25 <nopad> 26 <nopad> 27 1차 입주자 발표';
const cleanSchedule=core.cleanGuideText(rawSchedule,'namuwiki');
assert.ok(!/<rowcolor=|<nopad>/i.test(cleanSchedule),'나무위키 일정 태그가 공개 문장에 남으면 안 됩니다');
assert.match(cleanSchedule,/1차 입주자 발표/);

for(const sample of [
  'bb332c05-ca5c-4a8b-89a3-5161734707bf.jpg',
  '2026-06-24_07.10.13.png',
  '설명 앞 Gemini_Generated_Image_wb8kbvwb8kbvwb8k (2) (1) (1).png 다음 문장'
]){
  const clean=core.cleanGuideText(sample,'notion');
  assert.ok(!/\.(?:png|jpe?g|webp|gif|svg|avif)/i.test(clean),'Notion 이미지 파일명이 텍스트로 노출되면 안 됩니다: '+sample);
}

const namuMedia={src:'https://file.namu.moe/file/abcdef',provider:'namuwiki'};
const proxy=archive._internals.referenceGuideImageProxyUrl(namuMedia);
assert.match(proxy,/^\/api\/content\?type=reference-guide-image&url=/,'나무위키 이미지에는 동일 출처 프록시가 필요합니다');
assert.ok(archive._internals.allowedReferenceGuideImageUrl('https://file.namu.moe/file/abcdef'));
assert.equal(archive._internals.allowedReferenceGuideImageUrl('https://example.com/file.png'),null,'임의 외부 호스트는 reference proxy에서 차단해야 합니다');

assert.match(apiSource,/type==='reference-guide-image'.*handleReferenceGuideImage/s,'reference image route가 API에 연결되어야 합니다');
assert.match(archiveSource,/guide-media-v6/,'guide media migration 버전은 v6이어야 합니다');
assert.match(archiveSource,/attachmentSource&&media\?\.originalId/,'Notion 영구 저장 전에 attachment source로 signed URL을 갱신해야 합니다');
assert.match(archiveSource,/referenceGuideImageProxyUrl/,'나무위키 원격 이미지 fallback 프록시가 필요합니다');

console.log('content guide image + markup v6 regression passed');
