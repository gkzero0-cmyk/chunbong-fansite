import assert from 'node:assert/strict';
import fs from 'node:fs';

assert.equal(fs.existsSync('history.html'), true, 'history.html must provide a dedicated 춘봉 방송 이력 page');
assert.equal(fs.existsSync('history.js'), true, 'history.js must load the SOOP broadcast-history source');

const html = fs.readFileSync('history.html', 'utf8');
const js = fs.readFileSync('history.js', 'utf8');
const shared = fs.readFileSync('site-shell.js', 'utf8');
const sheetApi = fs.readFileSync('api/history-sheet.js', 'utf8');
const css = fs.readFileSync('history.css', 'utf8');

assert.match(html, /data-page=["']history["']/, 'history page must participate in the shared navigation state');
assert.match(html, /춘봉 방송 이력/, 'history page must be clearly titled');
assert.match(html, /202862381/, 'history page must link to the designated SOOP source post');
assert.match(html, /history\.js/, 'history page must load its dedicated runtime');
assert.match(html, /id=["']history-content["']/, 'history page must expose a render target');

assert.match(js, /SOURCE_DETAIL_API='\/api\/content\?type=notice-detail&id=202862381'/, 'history runtime must define the designated SOOP detail endpoint');
assert.match(js, /loadJson\(SOURCE_DETAIL_API\)/, 'history runtime must sync from the designated SOOP detail endpoint');
assert.match(js, /item\.html/, 'history runtime must render the sanitized source post HTML');
assert.match(js, /5\s*\*\s*60\s*\*\s*1000|300000/, 'history runtime must periodically refresh the source');
assert.match(js, /SOOP 원본|원본에서 보기/, 'history runtime must preserve an obvious path back to the SOOP source');
assert.match(js, /\/api\/content\?type=vod/, 'detail view must use VOD data as a thumbnail fallback');
assert.match(js, /function recordMedia\(/, 'detail view must resolve representative media per history record');
assert.match(js, /스프레드시트/, 'spreadsheet media must be preferred when available');
assert.match(js, /history-record-media/, 'detail view must render a representative image region');
assert.match(js, /챈나의 경찰과 도둑/, 'police-and-thief content must have an explicit classification rule');
assert.match(js, /마크 일일 콘텐츠/, 'police-and-thief content must be classified as a Minecraft daily content');
assert.match(js, /야구자의 왁업/, '왁업 must have an explicit Minecraft rule');
assert.match(js, /LAC 서버[^\n]*GTA 서버/, 'LAC must be classified as a GTA server');
assert.match(js, /진보이드 서버[^\n]*좀보이드 서버/, '진보이드 must be classified as a Zomboid server');
assert.match(js, /담월드[^\n]*팰월드 서버/, '담월드 must be classified as a Palworld server');
assert.match(js, /고세구의 세바버[^\n]*VRC/, '세바버 must be classified as VRC');
assert.match(js, /레오펠\\s\*2\\s\*무기한 연기[^\n]*importance:'normal'/, 'Leopel 2 postponement must stay out of simple history');
assert.match(js, /퍼켓몬\\s\*UP전쟁[^\n]*importance:'normal'/, 'Pokemon UP war must stay out of simple history');
assert.match(js, /2025 SOOP 스트리머 대상 참여/, 'award entry must explicitly say participation');
assert.match(js, /더켓몬 민원아저씨[^\n]*픽셀몬 서버/, '더켓몬 must be classified as a Minecraft Pixelmon server');
assert.match(js, /퍼켓몬[^\n]*픽셀몬 서버/, '퍼켓몬 must be classified as a Minecraft Pixelmon server');
assert.match(js, /모징어게임[^\n]*마크 대형 콘텐츠/, '모징어게임 must be classified as a Minecraft large collaboration');
assert.match(js, /청더일레븐[^\n]*마크 대회/, '청더일레븐 must be classified as a Minecraft competition');
assert.match(js, /염병서버[^\n]*서버·마크/, '염병서버 must be classified as Minecraft');
assert.match(js, /챈나룽 서버[^\n]*서버·마크/, '챈나룽 must be classified as Minecraft');
assert.match(js, /밍친서버[^\n]*서버·마크/, '밍친서버 must be classified as Minecraft');
assert.match(js, /주요 진행 기록/, 'detail view must surface a compact broadcast highlight summary');
assert.match(sheetApi, /extractImageUrl/, 'history sheet API must preserve image URLs exposed by published sheets');
assert.match(sheetApi, /imageSource:'sheet'/, 'spreadsheet images must be tagged as sheet media');
assert.match(css, /history-timeline-card\.has-media/, 'history detail media layout styles must exist');
assert.match(css, /aspect-ratio:16\/9/, 'representative history images must use a consistent 16:9 frame');

assert.match(shared, /history\.html/, 'shared navigation must expose the broadcast history page');
assert.match(shared, /방송 이력/, 'shared navigation must label the new page in Korean');

console.log('broadcast history page regression checks passed');
