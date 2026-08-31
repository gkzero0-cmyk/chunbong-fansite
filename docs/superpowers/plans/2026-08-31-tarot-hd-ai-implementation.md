# 춘봉 팬사이트 고화질 + AI 타로 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 78장 타로 기능을 원본 기반 고화질 카드로 교체하고, 사용자가 뽑은 카드와 질문을 OpenAI Responses API로 해석하는 선택형 AI 타로 상담 기능을 추가한다.

**Architecture:** 카드 앞면은 기존 6개 저해상도 AVIF 스프라이트 대신 `assets/tarot/hd/<card-id>.webp` 78개를 개별 정적 자산으로 제공하고 결과 화면에서 선택된 1~3장만 로드한다. AI 상담은 `api/tarot-reading.js` Vercel Serverless Function이 클라이언트 입력을 공식 `tarot-data.js`와 대조 검증한 뒤 OpenAI Responses API를 호출하며, 프론트는 기존 로컬 해석을 즉시 보여주고 사용자가 버튼을 누른 경우에만 AI를 호출한다.

**Tech Stack:** 정적 HTML/CSS/JavaScript, Node.js 20 CommonJS Vercel Functions, OpenAI Responses API (`gpt-5.6-luna` 기본), Python 3 + Pillow(로컬 자산 생성 전용), Node `assert` 기반 회귀 테스트, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-31-tarot-hd-ai-design.md`

## Global Constraints

- 메이저 22장 + 마이너 56장 = 정확히 78장이어야 한다.
- 사용자 첨부 원본은 `/mnt/data/tarot-source/춘봉 메이저 아르카나(1).zip`, `/mnt/data/tarot-source/마이너 아르카나.zip`을 사용한다.
- 카드 이미지는 원본보다 확대하지 않고 최대 폭 1024px를 유지하는 고품질 WebP로 생성한다.
- 결과 화면에서 카드 앞면은 CSS 스프라이트가 아니라 실제 `<img>`로 표시하고 강제 크롭하지 않는다.
- AI는 사용자가 `AI 타로 상담 받기`를 눌렀을 때만 호출한다.
- OpenAI API 키는 `OPENAI_API_KEY` 서버 환경변수에만 존재하며 HTML/브라우저 JS/GitHub 소스에 포함하지 않는다.
- 기본 모델은 `gpt-5.6-luna`, 선택적 오버라이드는 `OPENAI_TAROT_MODEL`이다. OpenAI 공식 모델 문서에서 GPT-5.6 Luna는 Responses API를 지원하는 비용 민감형 모델로 확인한다.
- 질문은 최대 500자, 카드는 정확히 1장 또는 3장, 카드 ID 중복은 금지한다.
- AI 실패/키 미설정 시에도 기존 로컬 기본 타로 해석은 계속 정상 동작해야 한다.
- 상담 질문과 결과를 DB, 로그, localStorage에 저장하지 않는다.
- 기존 공지 `126448625`, CATCH, 다시보기, 팬아트, 유튜브 기능은 변경하지 않는다.
- AI 출력은 HTML로 신뢰하지 않고 구조화된 텍스트 필드만 DOM `textContent`로 렌더링한다.

---

### Task 1: 고화질 78장 자산 계약을 테스트로 고정

**Files:**
- Create: `tests/tarot-hd-assets-regression.mjs`
- Modify: `tests/tarot-regression.mjs`

**Interfaces:**
- Consumes: 현재 `tarot-data.js`의 `cards: TarotCard[78]`.
- Produces: 모든 카드에 `imagePath: string`이 존재하고 `assets/tarot/hd/*.webp` 78개가 실재하며 충분한 픽셀 해상도를 갖는 계약.

- [ ] **Step 1: 기존 스프라이트 요구를 제거하고 고화질 경로 요구 테스트를 작성한다**

`tests/tarot-regression.mjs`의 카드 이미지 검사를 다음 계약으로 교체한다.

```js
for (const card of data.cards) {
  assert.ok(card.nameKo, `${card.id} must have a Korean name`);
  assert.ok(card.meaningUpright && card.meaningReversed, `${card.id} must have both meanings`);
  assert.ok(card.topicHints.daily && card.topicHints.concern && card.topicHints.love && card.topicHints.money && card.topicHints.game, `${card.id} must support every topic`);
  assert.equal(card.imagePath, `assets/tarot/hd/${card.id}.webp`, `${card.id} must use its individual HD artwork`);
}
assert.equal(new Set(data.cards.map(card => card.imagePath)).size, 78, 'all 78 cards must have unique HD artwork paths');
```

`tests/tarot-hd-assets-regression.mjs`에는 WebP 헤더와 VP8/VP8X 치수를 읽는 최소 파서를 넣는다.

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

function readWebpSize(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  const type = bytes.subarray(12, 16).toString('ascii');
  if (type === 'VP8X') {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  if (type === 'VP8 ') {
    const payload = 20;
    assert.equal(bytes.subarray(payload + 3, payload + 6).toString('hex'), '9d012a');
    return {
      width: bytes.readUInt16LE(payload + 6) & 0x3fff,
      height: bytes.readUInt16LE(payload + 8) & 0x3fff
    };
  }
  throw new Error(`unsupported WebP chunk ${type}`);
}

assert.equal(data.cards.length, 78);
for (const card of data.cards) {
  const path = new URL(card.imagePath, root);
  assert.ok(fs.existsSync(path), `${card.imagePath} should exist`);
  const bytes = fs.readFileSync(path);
  assert.ok(bytes.length > 40 * 1024, `${card.id} should contain high-detail artwork`);
  const size = readWebpSize(bytes);
  assert.ok(size.width >= 1000 && size.width <= 1024, `${card.id} width should stay near source resolution`);
  assert.ok(size.height >= 1400, `${card.id} height should preserve card detail`);
}
console.log('78 HD tarot WebP assets regression test passed');
```

- [ ] **Step 2: 테스트를 실행해 RED를 확인한다**

Run:
```bash
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
```

Expected: `imagePath`가 없거나 `assets/tarot/hd/*.webp`가 없어서 FAIL. 기존 스프라이트 상태에서 테스트가 우연히 통과하면 안 된다.

- [ ] **Step 3: 테스트만 커밋한다**

```bash
git add tests/tarot-regression.mjs tests/tarot-hd-assets-regression.mjs
git commit -m "test: require high resolution tarot card assets"
```

---

### Task 2: 원본 ZIP에서 78장 개별 고화질 WebP 생성 및 카드 데이터 연결

**Files:**
- Create: `scripts/build-tarot-hd-assets.py`
- Create: `assets/tarot/hd/major-00.webp` … `assets/tarot/hd/major-21.webp`
- Create: `assets/tarot/hd/swords-ace.webp` … `assets/tarot/hd/pentacles-king.webp` (56 files)
- Modify: `tarot-data.js`
- Delete after GREEN: `assets/tarot/cards-0.js` … `assets/tarot/cards-5.js`

**Interfaces:**
- Consumes: 메이저 ZIP `0번.png`~`21번.png`, 마이너 ZIP의 `소드|완드|컵|펜타클` × `에이스,2..10,시종,기사,여왕,왕`.
- Produces: `TarotCard.imagePath`와 일대일로 대응하는 78개의 고해상도 WebP.

- [ ] **Step 1: 재현 가능한 자산 생성 스크립트를 작성한다**

`scripts/build-tarot-hd-assets.py`의 핵심 매핑과 변환은 다음처럼 고정한다.

```python
from pathlib import Path
from PIL import Image
import argparse, io, zipfile

SUITS = [('소드','swords'), ('완드','wands'), ('컵','cups'), ('펜타클','pentacles')]
RANKS = [('에이스','ace'), ('2','02'), ('3','03'), ('4','04'), ('5','05'), ('6','06'), ('7','07'), ('8','08'), ('9','09'), ('10','10'), ('시종','page'), ('기사','knight'), ('여왕','queen'), ('왕','king')]

def convert(raw: bytes, dest: Path):
    with Image.open(io.BytesIO(raw)) as image:
        image = image.convert('RGB')
        if image.width > 1024:
            height = round(image.height * 1024 / image.width)
            image = image.resize((1024, height), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest, 'WEBP', quality=92, method=6)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--major-zip', required=True)
    parser.add_argument('--minor-zip', required=True)
    parser.add_argument('--output', default='assets/tarot/hd')
    args = parser.parse_args()
    out = Path(args.output)
    with zipfile.ZipFile(args.major_zip) as z:
        for number in range(22):
            convert(z.read(f'{number}번.png'), out / f'major-{number:02d}.webp')
    with zipfile.ZipFile(args.minor_zip) as z:
        for ko_suit, suit_id in SUITS:
            for ko_rank, rank_id in RANKS:
                convert(z.read(f'{ko_suit} {ko_rank}.png'), out / f'{suit_id}-{rank_id}.webp')

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Pillow를 로컬 작업 환경에 설치하고 78장 자산을 생성한다**

Run:
```bash
python -m pip install Pillow
python scripts/build-tarot-hd-assets.py \
  --major-zip '/mnt/data/tarot-source/춘봉 메이저 아르카나(1).zip' \
  --minor-zip '/mnt/data/tarot-source/마이너 아르카나.zip' \
  --output assets/tarot/hd
```

Expected: `find assets/tarot/hd -name '*.webp' | wc -l` → `78`.

- [ ] **Step 3: `tarot-data.js`의 이미지 매핑을 개별 경로로 교체한다**

기존 `withImageSlot`을 제거하고 다음 helper를 사용한다.

```js
const withImagePath = card => ({ ...card, imagePath: `assets/tarot/hd/${card.id}.webp` });
```

메이저/마이너 카드 생성 마지막에 `withImagePath(...)`를 적용하고 `imageSheet`, `imageSlot` 생성 코드를 제거한다.

- [ ] **Step 4: 고화질 자산 테스트와 기존 타로 데이터 테스트를 GREEN으로 만든다**

Run:
```bash
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
node --check tarot-data.js
```

Expected: 모두 PASS.

- [ ] **Step 5: 새 자산 검증 후 저해상도 스프라이트 6개를 삭제한다**

```bash
rm assets/tarot/cards-{0,1,2,3,4,5}.js
```

`tarot.html`에서 `assets/tarot/cards-0.js`~`cards-5.js` `<script>` 태그도 삭제한다.

- [ ] **Step 6: 카드 자산 교체를 커밋한다**

```bash
git add scripts/build-tarot-hd-assets.py assets/tarot/hd tarot-data.js tarot.html assets/tarot/cards-*.js
git commit -m "feat: replace tarot sprites with HD card artwork"
```

---

### Task 3: 결과 카드 렌더러를 실제 고해상도 `<img>`로 교체

**Files:**
- Modify: `tarot.js`
- Modify: `tarot.css`
- Modify: `tests/tarot-regression.mjs`

**Interfaces:**
- Consumes: `selection.card.imagePath`.
- Produces: 선택된 1~3장만 요청하는 `<img class="tarot-card-image">`, 역방향 회전은 `.tarot-card-art.is-reversed` 래퍼가 담당.

- [ ] **Step 1: 렌더링 계약을 먼저 테스트에 추가한다**

`tests/tarot-regression.mjs`에 다음 검사를 추가한다.

```js
const tarotScript = read('tarot.js');
assert.ok(tarotScript.includes('selection.card.imagePath'), 'result renderer must use individual HD imagePath');
assert.ok(tarotScript.includes('loading="lazy"'), 'HD card images should lazy-load');
assert.ok(tarotScript.includes('decoding="async"'), 'HD card images should decode asynchronously');
assert.ok(!tarotScript.includes('CHUNBONG_TAROT_SHEETS'), 'old sprite sheets must not be used');

const css = read('tarot.css');
assert.ok(css.includes('.tarot-card-image'), 'HD image styling must exist');
assert.ok(css.includes('object-fit:contain'), 'card artwork must not be cropped');
assert.ok(!css.includes('background-size:1300%'), 'sprite scaling must be removed');
```

- [ ] **Step 2: 테스트를 실행해 RED를 확인한다**

Run: `node tests/tarot-regression.mjs`

Expected: 기존 `CHUNBONG_TAROT_SHEETS`/background sprite 렌더링 때문에 FAIL.

- [ ] **Step 3: `renderResults()`에서 실제 `<img>`를 출력한다**

기존 `data-sheet`/`data-slot` div를 다음 구조로 교체한다.

```js
<div class="tarot-card-art ${reversed ? 'is-reversed' : ''}">
  <img class="tarot-card-image" src="${escapeHtml(selection.card.imagePath)}" alt="${escapeHtml(selection.card.nameKo)} ${direction}" loading="lazy" decoding="async">
  <span class="tarot-card-image-fallback">카드 이미지를 불러오지 못했습니다.</span>
</div>
```

`applyCardArtwork()`는 삭제하고, 결과 렌더 직후 이미지 error listener를 등록한다.

```js
byId('tarot-reading-grid').querySelectorAll('.tarot-card-image').forEach(image => {
  image.addEventListener('error', () => image.closest('.tarot-card-art')?.classList.add('is-missing'), { once: true });
});
```

- [ ] **Step 4: CSS에서 스프라이트 배경을 제거하고 이미지 자체를 선명하게 표시한다**

```css
.tarot-card-art{position:relative;width:100%;aspect-ratio:2/3;border-radius:18px;background:#080808;box-shadow:0 18px 50px #000c,0 0 0 1px #ff9d2e28;overflow:hidden;transition:transform .45s;display:grid;place-items:center}
.tarot-card-image{display:block;width:100%;height:100%;object-fit:contain}
.tarot-card-image-fallback{display:none;color:#777;padding:20px;text-align:center}
.tarot-card-art.is-missing .tarot-card-image{display:none}
.tarot-card-art.is-missing .tarot-card-image-fallback{display:block}
.tarot-card-art.is-reversed{transform:rotate(180deg)}
```

- [ ] **Step 5: 렌더링 테스트를 GREEN으로 만든다**

Run:
```bash
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
node --check tarot.js
```

Expected: 모두 PASS.

- [ ] **Step 6: 렌더러 교체를 커밋한다**

```bash
git add tarot.js tarot.css tests/tarot-regression.mjs
git commit -m "feat: render selected tarot cards in HD"
```

---

### Task 4: AI 요청 검증과 OpenAI Responses API 서버리스 엔드포인트 구현

**Files:**
- Create: `api/tarot-reading.js`
- Create: `tests/tarot-ai-api-regression.mjs`

**Interfaces:**
- Consumes POST JSON `{ question, topic, spreadId, cards:[{id,orientation,position}] }`.
- Produces HTTP 200 `{ reading:{title,overall,cards,advice,summary}, model }` 또는 400/405/429/502/503.
- Exports: default Vercel handler function plus `createHandler`, `validateReadingRequest`, `buildOpenAIRequest`, `extractStructuredReading` properties for isolated unit tests.

- [ ] **Step 1: 서버 API 회귀 테스트를 먼저 작성한다**

`tests/tarot-ai-api-regression.mjs`에 최소 다음 시나리오를 구현한다.

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const api = require('../api/tarot-reading.js');

function makeReq(method, body) { return { method, body, headers: { 'content-type': 'application/json' } }; }
function makeRes() {
  return {
    statusCode: 200, payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

const validBody = {
  question: '지금 준비 중인 일을 계속해도 괜찮을까?',
  topic: 'concern', spreadId: 'situationAdviceOutcome',
  cards: [
    { id:'major-16', orientation:'upright', position:'상황' },
    { id:'major-17', orientation:'upright', position:'조언' },
    { id:'cups-03', orientation:'reversed', position:'결과' }
  ]
};

{
  const res = makeRes();
  await api.createHandler({ env: {}, fetchImpl: async () => { throw new Error('must not call'); } })(makeReq('POST', validBody), res);
  assert.equal(res.statusCode, 503);
}

{
  const res = makeRes();
  const invalid = structuredClone(validBody);
  invalid.cards[0].id = 'not-a-card';
  await api.createHandler({ env: { OPENAI_API_KEY:'test' }, fetchImpl: async () => { throw new Error('must not call'); } })(makeReq('POST', invalid), res);
  assert.equal(res.statusCode, 400);
}
```

같은 파일에서 GET→405, 중복 카드→400, 잘못된 position→400, 501자 질문→400, OpenAI 429→429, malformed output→502, 정상 structured output→200도 검증한다.

- [ ] **Step 2: 테스트를 실행해 RED를 확인한다**

Run: `node tests/tarot-ai-api-regression.mjs`

Expected: `api/tarot-reading.js`가 없어서 FAIL.

- [ ] **Step 3: 요청 검증 함수를 구현한다**

`api/tarot-reading.js`에서 공식 데이터를 서버가 다시 조회한다.

```js
const DATA = require('../tarot-data.js');
const cardById = new Map(DATA.cards.map(card => [card.id, card]));

function validateReadingRequest(body) {
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (question.length > 500) throw Object.assign(new Error('question_too_long'), { statusCode: 400 });
  const topic = String(body?.topic || '');
  const spreadId = String(body?.spreadId || '');
  if (!DATA.topics[topic] || !DATA.spreads[spreadId]) throw Object.assign(new Error('invalid_reading'), { statusCode: 400 });
  const cards = Array.isArray(body.cards) ? body.cards : [];
  const positions = DATA.spreads[spreadId].positions;
  if (![1, 3].includes(cards.length) || positions.length !== cards.length) throw Object.assign(new Error('invalid_card_count'), { statusCode: 400 });
  const seen = new Set();
  const validated = cards.map((item, index) => {
    const card = cardById.get(String(item.id || ''));
    if (!card || seen.has(card.id)) throw Object.assign(new Error('invalid_card'), { statusCode: 400 });
    seen.add(card.id);
    const orientation = String(item.orientation || '');
    if (!['upright','reversed'].includes(orientation) || item.position !== positions[index]) throw Object.assign(new Error('invalid_position'), { statusCode: 400 });
    return { card, orientation, position: positions[index] };
  });
  return { question, topic, spreadId, cards: validated };
}
```

- [ ] **Step 4: OpenAI 구조화 출력 schema와 요청 body를 구현한다**

```js
const READING_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title','overall','cards','advice','summary'],
  properties: {
    title: { type: 'string' },
    overall: { type: 'string' },
    cards: { type: 'array', minItems: 1, maxItems: 3, items: {
      type: 'object', additionalProperties: false,
      required: ['id','position','reading'],
      properties: { id:{type:'string'}, position:{type:'string'}, reading:{type:'string'} }
    }},
    advice: { type: 'array', minItems: 2, maxItems: 4, items: { type:'string' } },
    summary: { type:'string' }
  }
};

function buildOpenAIRequest(validated, model) {
  const topicLabel = DATA.topics[validated.topic].label;
  const spreadLabel = DATA.spreads[validated.spreadId].label;
  const cardText = validated.cards.map(({card,orientation,position}) => {
    const direction = orientation === 'upright' ? '정방향' : '역방향';
    const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
    return `${position}: ${card.nameKo} ${direction} — ${meaning}`;
  }).join('\n');
  return {
    model,
    reasoning: { effort: 'low' },
    max_output_tokens: 1200,
    instructions: '당신은 타로를 자기성찰과 선택 점검을 돕는 참고 도구로 해석하는 한국어 상담자입니다. 운명을 확정적으로 단언하거나 불안을 조장하지 마세요. 건강·법률·투자 등 고위험 사안에서는 전문 진단이나 확정적 예측을 하지 말고 현실적으로 확인할 정보와 행동을 제시하세요.',
    input: `주제: ${topicLabel}\n스프레드: ${spreadLabel}\n질문: ${validated.question || '질문 없음'}\n카드:\n${cardText}`,
    text: { format: { type:'json_schema', name:'tarot_reading', strict:true, schema: READING_SCHEMA } }
  };
}
```

- [ ] **Step 5: raw Responses API 응답에서 output_text를 안전하게 추출한다**

```js
function extractStructuredReading(responseBody) {
  const text = (responseBody.output || [])
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .find(part => part.type === 'output_text')?.text;
  if (!text) throw new Error('missing_output_text');
  return JSON.parse(text);
}
```

- [ ] **Step 6: `createHandler()`와 Vercel export를 구현한다**

OpenAI 호출은 다음 REST endpoint로 고정한다.

```js
async function callOpenAI(fetchImpl, apiKey, requestBody) {
  return fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type':'application/json', authorization:`Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });
}
```

`createHandler({ fetchImpl = global.fetch, env = process.env } = {})`는 POST만 허용하고, `env.OPENAI_API_KEY`가 없으면 503, OpenAI가 429면 429, 기타 non-2xx/파싱 실패는 502로 반환한다. 질문 본문은 로그에 출력하지 않는다.

마지막 export:

```js
const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
module.exports.validateReadingRequest = validateReadingRequest;
module.exports.buildOpenAIRequest = buildOpenAIRequest;
module.exports.extractStructuredReading = extractStructuredReading;
```

- [ ] **Step 7: AI API 테스트를 GREEN으로 만든다**

Run:
```bash
node --check api/tarot-reading.js
node tests/tarot-ai-api-regression.mjs
```

Expected: 네트워크를 실제 호출하지 않고 모든 mock 시나리오 PASS.

- [ ] **Step 8: 서버 API를 커밋한다**

```bash
git add api/tarot-reading.js tests/tarot-ai-api-regression.mjs
git commit -m "feat: add OpenAI tarot reading API"
```

---

### Task 5: AI 상담 버튼과 상담 결과 UI를 기존 타로 결과에 추가

**Files:**
- Modify: `tarot.html`
- Modify: `tarot.js`
- Modify: `tarot.css`
- Modify: `tests/tarot-regression.mjs`

**Interfaces:**
- Consumes: 현재 `state.selected`, `state.question`, `state.topic`, `state.spreadId`; POST `/api/tarot-reading`.
- Produces: 준비/로딩/성공/오류 네 상태를 가진 AI 상담 패널.
- Pure export 추가: `buildAiRequestPayload(state): {question,topic,spreadId,cards}`.

- [ ] **Step 1: 프론트 AI 계약을 테스트에 먼저 추가한다**

```js
const html = read('tarot.html');
for (const token of ['id="tarot-ai-panel"', 'id="tarot-ai-button"', 'id="tarot-ai-status"', 'id="tarot-ai-content"']) {
  assert.ok(html.includes(token), `tarot.html should include ${token}`);
}
const aiPayload = tarot.buildAiRequestPayload({
  question:'질문', topic:'concern', spreadId:'single',
  selected:[{ card:data.cards[0], orientation:'upright', position:'메시지' }]
});
assert.deepEqual(aiPayload.cards, [{ id:data.cards[0].id, orientation:'upright', position:'메시지' }]);
assert.ok(read('tarot.js').includes("fetch('/api/tarot-reading'"));
assert.ok(read('tarot.js').includes('.textContent'), 'AI result renderer should use textContent');
```

- [ ] **Step 2: 테스트 RED 확인**

Run: `node tests/tarot-regression.mjs`

Expected: AI panel/payload helper가 없어서 FAIL.

- [ ] **Step 3: `tarot.html` 결과 영역에 AI 패널을 추가한다**

`tarot-summary` 다음에 다음 구조를 추가한다.

```html
<section id="tarot-ai-panel" class="tarot-ai-panel" aria-live="polite">
  <div class="tarot-ai-head"><div><p class="kicker">AI TAROT COUNSELING</p><h2>AI 타로 상담</h2></div></div>
  <p id="tarot-ai-status">뽑은 카드와 질문을 바탕으로 조금 더 자세한 상담형 리딩을 받을 수 있습니다.</p>
  <button id="tarot-ai-button" class="btn btn-primary" type="button">AI 타로 상담 받기</button>
  <div id="tarot-ai-content" class="tarot-ai-content" hidden></div>
</section>
```

- [ ] **Step 4: `buildAiRequestPayload()`와 AI 상태 초기화를 구현한다**

```js
function buildAiRequestPayload(readingState) {
  return {
    question: readingState.question || '',
    topic: readingState.topic,
    spreadId: readingState.spreadId,
    cards: readingState.selected.map(({ card, orientation, position }) => ({ id: card.id, orientation, position }))
  };
}
```

`startReading()`, `resetReading()`, 새 결과 완성 시 `state.aiSucceeded = false`로 초기화하고 AI 패널을 준비 상태로 돌린다.

- [ ] **Step 5: AI 응답은 createElement/textContent만 사용해 렌더링한다**

`renderAiReading(reading)`은 `innerHTML = model output`을 사용하지 않는다. 제목, overall, 카드별 reading, advice `<li>`, summary를 `document.createElement`와 `.textContent`로 생성한다.

- [ ] **Step 6: 버튼 클릭 시 POST하고 상태를 전환한다**

```js
async function requestAiReading() {
  if (state.aiSucceeded) return;
  const button = byId('tarot-ai-button');
  const status = byId('tarot-ai-status');
  button.disabled = true;
  status.textContent = '카드를 읽고 있어요...';
  try {
    const response = await fetch('/api/tarot-reading', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify(buildAiRequestPayload(state))
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.reading) throw new Error('ai_reading_failed');
    renderAiReading(payload.reading);
    state.aiSucceeded = true;
    status.textContent = 'AI 상담 리딩이 준비됐습니다.';
    button.hidden = true;
  } catch (_) {
    status.textContent = 'AI 상담을 불러오지 못했습니다. 기본 해석은 그대로 이용할 수 있습니다.';
    button.textContent = '다시 시도';
    button.disabled = false;
  }
}
```

- [ ] **Step 7: AI 패널 스타일과 reduced-motion 로딩 상태를 추가한다**

`.tarot-ai-panel`, `.tarot-ai-content`, `.tarot-ai-card-reading`, `.tarot-ai-advice`, `.tarot-ai-summary`를 기존 검정/주황 테마와 맞추고, 로딩 효과가 있다면 `prefers-reduced-motion`에서 애니메이션을 끈다.

- [ ] **Step 8: 프론트 테스트를 GREEN으로 만든다**

Run:
```bash
node tests/tarot-regression.mjs
node --check tarot.js
```

Expected: PASS.

- [ ] **Step 9: AI 프론트 기능을 커밋한다**

```bash
git add tarot.html tarot.js tarot.css tests/tarot-regression.mjs
git commit -m "feat: add AI tarot counseling UI"
```

---

### Task 6: 전체 CI에 HD 자산 및 AI API 회귀를 포함

**Files:**
- Modify: `.github/workflows/catch-regression.yml`
- Keep/Modify: `tests/tarot-assets-regression.mjs` — 구 저해상도 시트 테스트는 삭제하거나 `tarot-hd-assets-regression.mjs`로 완전히 대체

**Interfaces:**
- Consumes: Task 1~5 테스트.
- Produces: 기존 사이트 회귀 + 신규 HD/AI 회귀를 한 번에 검증하는 `Site regression` workflow.

- [ ] **Step 1: 기능 브랜치에서 CI가 실행되도록 작업 중에만 branch trigger를 확장한다**

실행 브랜치 이름을 `feat/tarot-hd-ai`로 사용하고 작업 중에는:

```yaml
on:
  push:
    branches: [main, feat/tarot-hd-ai]
```

- [ ] **Step 2: 신규 검증 단계를 추가한다**

```yaml
      - name: Check Tarot AI API syntax
        run: node --check api/tarot-reading.js
      - name: Run Tarot HD asset regression
        run: node tests/tarot-hd-assets-regression.mjs
      - name: Run Tarot AI API regression
        run: node tests/tarot-ai-api-regression.mjs
```

기존 `Run Tarot asset regression`이 저해상도 시트를 검사하면 제거한다.

- [ ] **Step 3: 기능 브랜치 전체 workflow를 실행해 모든 단계가 GREEN인지 확인한다**

필수 성공 단계:

```text
Check API syntax
Run Catch source regression
Run Catch embed regression
Run notice single-board regression
Run Tarot feature regression
Check Tarot syntax
Check Tarot AI API syntax
Run Tarot HD asset regression
Run Tarot AI API regression
Run multipage smoke regression
```

- [ ] **Step 4: CI 변경을 커밋한다**

```bash
git add .github/workflows/catch-regression.yml tests
git commit -m "test: cover HD and AI tarot regressions"
```

---

### Task 7: 기능 브랜치 최종 검증, main 반영, Vercel 배포 확인

**Files:**
- Modify after merge: `.github/workflows/catch-regression.yml` branch trigger back to `[main]`.

**Interfaces:**
- Consumes: 검증된 `feat/tarot-hd-ai`.
- Produces: `main`에 배포 가능한 고화질 + AI 타로 코드. API 키가 없어도 기본 타로는 정상이며 AI endpoint는 503을 명시적으로 반환.

- [ ] **Step 1: 통합 직전 기능 브랜치 전체 테스트를 새로 실행한다**

Run:
```bash
node --check api/clips.js
node --check api/notice.js
node --check api/_shared.js
node --check api/tarot-reading.js
node --check tarot-data.js
node --check tarot.js
node tests/catch-page-source-regression.mjs
node tests/catch-playback-schedule-removal-regression.mjs
node tests/notice-single-board-regression.mjs
node tests/tarot-regression.mjs
node tests/tarot-hd-assets-regression.mjs
node tests/tarot-ai-api-regression.mjs
node tests/multipage-smoke.mjs
```

Expected: 전부 exit 0.

- [ ] **Step 2: `main...feat/tarot-hd-ai` 비교에서 behind=0인지 확인하고 fast-forward 가능한 경우만 main에 반영한다**

충돌/behind가 있으면 main 최신 변경을 먼저 기능 브랜치에 통합한 뒤 Step 1 전체 테스트를 다시 실행한다.

- [ ] **Step 3: main 반영 후 CI trigger를 다시 main 전용으로 정리한다**

```yaml
on:
  push:
    branches: [main]
```

- [ ] **Step 4: 최종 main commit의 GitHub Actions가 GREEN인지 새로 확인한다**

이전 기능 브랜치 성공 결과를 최종 증거로 재사용하지 않는다.

- [ ] **Step 5: 같은 최종 main commit의 Vercel status가 `success`인지 확인한다**

Vercel status context가 `Deployment has completed`를 반환해야 한다.

- [ ] **Step 6: 키 미설정 상태의 API fallback도 확인한다**

`OPENAI_API_KEY`가 아직 없으면 운영 `/api/tarot-reading`은 POST에 503을 반환할 수 있으나 `/tarot.html` 기본 카드 뽑기/기본 해석은 계속 동작해야 한다. 이 상태를 AI 기능 완료로 오인하지 않는다.

---

### Task 8: Vercel에 OpenAI API 키를 안전하게 연결하고 실제 AI 상담 smoke test

**Files:**
- No repository source file contains the secret.
- Vercel Project Settings environment variable: `OPENAI_API_KEY`
- Optional: `OPENAI_TAROT_MODEL=gpt-5.6-luna`

**Interfaces:**
- Consumes: 사용자의 OpenAI API key를 Vercel Production 환경변수로 설정.
- Produces: 실제 `/api/tarot-reading` 200 structured reading.

- [ ] **Step 1: 비밀키를 채팅/GitHub에 붙여넣지 않고 Vercel 환경변수로 등록한다**

현재 연결된 Vercel 도구에는 환경변수 쓰기 action이 노출되어 있지 않으므로 이 한 단계는 사용자가 Vercel UI에서 수행한다.

UI 경로:
```text
Vercel → chunbong-fansite → Settings → Environment Variables
Name: OPENAI_API_KEY
Value: 사용자의 OpenAI API key
Environment: Production
```

원하면 Preview에도 동일 키를 별도로 허용한다. `OPENAI_TAROT_MODEL`은 생략하면 서버 기본값 `gpt-5.6-luna`를 사용한다.

- [ ] **Step 2: 환경변수 저장 후 Production을 재배포한다**

Vercel이 기존 deployment에 새 env를 자동 소급하지 않으므로 새 production deployment를 생성한다.

- [ ] **Step 3: 실제 AI 상담 smoke test를 한 번 수행한다**

안전한 예시 요청:

```json
{
  "question":"이번 주에 집중하면 좋은 점은 무엇일까?",
  "topic":"daily",
  "spreadId":"single",
  "cards":[{"id":"major-19","orientation":"upright","position":"메시지"}]
}
```

Expected: HTTP 200, `reading.title`, `reading.overall`, `reading.cards[0].reading`, `reading.advice`, `reading.summary`가 모두 문자열/문자열 배열로 존재하고 `model`이 `gpt-5.6-luna` 또는 `OPENAI_TAROT_MODEL` 값과 일치.

- [ ] **Step 4: 브라우저 최종 UX를 확인한다**

```text
https://chunbong-fansite.vercel.app/tarot.html
```

확인 항목:
- 1장/3장 카드가 확대되어도 원본 세부 묘사와 글자가 선명함
- 역방향 카드는 전체 카드가 180° 회전하지만 잘리지 않음
- 기본 해석이 AI보다 먼저 표시됨
- AI 버튼은 사용자 클릭 전 네트워크 호출을 하지 않음
- AI 성공 후 동일 리딩에서 중복 성공 호출 버튼이 숨겨짐
- 실패 시 기본 해석이 사라지지 않고 다시 시도만 가능함
- 모바일 폭에서도 카드와 AI 리딩이 화면 밖으로 넘치지 않음

- [ ] **Step 5: 최종 상태를 보고한다**

완료 보고에는 반드시 다음 fresh evidence를 포함한다.

```text
- 최종 main commit SHA
- 최종 GitHub Actions run ID + success
- Vercel deployment status + success
- 실제 AI smoke test HTTP 200 (키 설정 후에만)
```

키가 아직 설정되지 않았다면 `코드/배포 완료, 실제 AI 호출은 OPENAI_API_KEY 설정 대기`라고 정확히 구분해 보고한다.
