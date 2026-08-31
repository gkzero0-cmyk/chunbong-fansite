# 춘봉 팬사이트 TAROT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 춘봉 팬사이트에 사용자가 제공한 메이저 22장 + 마이너 56장 이미지로 동작하는 78장 풀덱 타로 기능을 추가한다.

**Architecture:** 기존 정적 멀티페이지 구조는 유지하고 `tarot.html`, `tarot-data.js`, `tarot.js`를 독립적으로 추가한다. 공통 네비게이션은 기존 `page.js`의 `data-page`/`data-nav` 활성화 로직을 그대로 사용하며, 카드 랜덤/해석/DOM 상태는 타로 전용 파일 안에서 처리해 SOOP 공지·CATCH·일정 API 로직과 분리한다.

**Tech Stack:** HTML5, 기존 `styles.css`, 바닐라 JavaScript, Node.js 회귀 테스트, WebP 정적 이미지, GitHub Actions, Vercel

**Spec:** `docs/superpowers/specs/2026-08-31-tarot-feature-design.md`

## Global Constraints

- AI API, 사용자 계정, 서버 저장, 결제 기능은 추가하지 않는다.
- 메이저 입력 ZIP은 `/mnt/data/춘봉 메이저 아르카나(1).zip`, 마이너 입력 ZIP은 `/mnt/data/마이너 아르카나.zip`을 사용한다.
- 최종 덱은 메이저 22장 + 마이너 56장 = 정확히 78장이다.
- 정방향/역방향은 카드마다 독립적으로 50% 확률이며, 가능한 경우 `crypto.getRandomValues()`를 사용한다.
- 3장 스프레드는 `과거 · 현재 · 미래`와 `상황 · 조언 · 결과`를 모두 제공한다.
- 카드 결과는 확정적 예언이 아니라 가능성과 자기성찰 중심 문장으로 표시한다.
- 기존 공지/CATCH/일정 기능을 변경하거나 재구성하지 않는다.
- 카드 이미지는 원본 비율을 유지한 WebP로 변환하고 긴 변을 최대 1152px로 제한한다.

---

### Task 1: 78장 카드 이미지를 웹 자산으로 준비

**Files:**
- Create: `assets/tarot/major/*.webp`
- Create: `assets/tarot/minor/*.webp`
- Create: `tests/tarot-assets-regression.mjs`

**Interfaces:**
- Produces: 메이저 경로 `assets/tarot/major/00-fool.webp` ~ `21-world.webp`
- Produces: 마이너 경로 `assets/tarot/minor/{swords|wands|cups|pentacles}-{ace|02..10|page|knight|queen|king}.webp`

- [ ] **Step 1: 자산 존재 테스트를 먼저 작성**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const major = fs.readdirSync(new URL('assets/tarot/major/', root)).filter(n => n.endsWith('.webp'));
const minor = fs.readdirSync(new URL('assets/tarot/minor/', root)).filter(n => n.endsWith('.webp'));
assert.equal(major.length, 22, 'major tarot assets must contain 22 WebP files');
assert.equal(minor.length, 56, 'minor tarot assets must contain 56 WebP files');
assert.ok(major.includes('00-fool.webp'));
assert.ok(major.includes('21-world.webp'));
assert.ok(minor.includes('swords-ace.webp'));
assert.ok(minor.includes('pentacles-king.webp'));
const total = [...major.map(n => `major/${n}`), ...minor.map(n => `minor/${n}`)]
  .reduce((sum, n) => sum + fs.statSync(new URL(`assets/tarot/${n}`, root)).size, 0);
assert.ok(total < 50 * 1024 * 1024, 'optimized tarot assets should stay below 50 MB total');
console.log('tarot asset regression test passed');
```

- [ ] **Step 2: 테스트가 자산 부재로 실패하는지 확인**

Run: `node tests/tarot-assets-regression.mjs`
Expected: FAIL because `assets/tarot/major` or `assets/tarot/minor` does not exist.

- [ ] **Step 3: ZIP을 WebP로 변환**

```python
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image

major_zip = Path('/mnt/data/춘봉 메이저 아르카나(1).zip')
minor_zip = Path('/mnt/data/마이너 아르카나.zip')
out_major = Path('assets/tarot/major')
out_minor = Path('assets/tarot/minor')
out_major.mkdir(parents=True, exist_ok=True)
out_minor.mkdir(parents=True, exist_ok=True)

major_slugs = [
 'fool','magician','high-priestess','empress','emperor','hierophant','lovers','chariot','strength','hermit',
 'wheel-of-fortune','justice','hanged-man','death','temperance','devil','tower','star','moon','sun','judgement','world'
]
suit_slugs = {'소드':'swords','완드':'wands','컵':'cups','펜타클':'pentacles'}
rank_slugs = {'에이스':'ace','시종':'page','기사':'knight','여왕':'queen','왕':'king', **{str(i):f'{i:02d}' for i in range(2,11)}}

def save_webp(raw, dest):
    image = Image.open(BytesIO(raw)).convert('RGB')
    image.thumbnail((1152, 1152), Image.Resampling.LANCZOS)
    image.save(dest, 'WEBP', quality=82, method=6)

with ZipFile(major_zip) as z:
    for number, slug in enumerate(major_slugs):
        save_webp(z.read(f'{number}번.png'), out_major / f'{number:02d}-{slug}.webp')

with ZipFile(minor_zip) as z:
    for name in z.namelist():
        if not name.endswith('.png'): continue
        stem = Path(name).stem
        suit, rank = stem.split(' ', 1)
        save_webp(z.read(name), out_minor / f'{suit_slugs[suit]}-{rank_slugs[rank]}.webp')
```

- [ ] **Step 4: 자산 테스트 재실행**

Run: `node tests/tarot-assets-regression.mjs`
Expected: PASS.

- [ ] **Step 5: 자산 커밋**

```bash
git add assets/tarot tests/tarot-assets-regression.mjs
git commit -m "feat: add optimized tarot card assets"
```

---

### Task 2: 78장 데이터와 순수 타로 로직 작성

**Files:**
- Create: `tarot-data.js`
- Create: `tarot.js`
- Create: `tests/tarot-regression.mjs`

**Interfaces:**
- `tarot-data.js` produces `CHUNBONG_TAROT_DATA = { cards, topics, spreads }` in browser and `module.exports` in Node.
- `tarot.js` produces `random01()`, `shuffleDeck(cards, randomFn)`, `orientationFromRandom(randomFn)`, `buildCardInterpretation(selection, topicId, position)`, `buildSummary(selections, topicId, spreadId)`.

- [ ] **Step 1: 데이터/로직 회귀 테스트 작성**

```js
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const tarot = require('../tarot.js');

assert.equal(data.cards.length, 78);
assert.equal(data.cards.filter(c => c.arcana === 'major').length, 22);
assert.equal(data.cards.filter(c => c.arcana === 'minor').length, 56);
assert.equal(new Set(data.cards.map(c => c.id)).size, 78);
assert.deepEqual(data.spreads.pastPresentFuture.positions, ['과거','현재','미래']);
assert.deepEqual(data.spreads.situationAdviceOutcome.positions, ['상황','조언','결과']);

const deterministic = (() => { const values = [0.99,0.01,0.75,0.25,0.6,0.4]; let i=0; return () => values[i++ % values.length]; })();
const shuffled = tarot.shuffleDeck(data.cards.slice(0, 6), deterministic);
assert.equal(new Set(shuffled.map(c => c.id)).size, 6);
assert.equal(tarot.orientationFromRandom(() => 0.1), 'upright');
assert.equal(tarot.orientationFromRandom(() => 0.9), 'reversed');

const sample = { card: data.cards[0], orientation: 'upright' };
assert.ok(tarot.buildCardInterpretation(sample, 'daily', '현재').includes(data.cards[0].nameKo));
assert.ok(tarot.buildSummary([sample], 'daily', 'single').length > 20);
console.log('tarot data and logic regression test passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because `tarot-data.js` and `tarot.js` do not exist.

- [ ] **Step 3: `tarot-data.js` 구현**

Use a CommonJS/browser dual export:

```js
const CHUNBONG_TAROT_DATA = (() => {
  const topics = {
    daily:{label:'오늘의 타로'}, concern:{label:'고민 상담'}, love:{label:'연애운'}, money:{label:'금전운'}, game:{label:'방송·게임운'}
  };
  const spreads = {
    single:{label:'한 장 메시지',positions:['메시지']},
    pastPresentFuture:{label:'과거 · 현재 · 미래',positions:['과거','현재','미래']},
    situationAdviceOutcome:{label:'상황 · 조언 · 결과',positions:['상황','조언','결과']}
  };
  // 메이저는 0~21 표준 명칭과 각 카드의 정/역방향 키워드·의미를 명시적으로 작성한다.
  // 마이너는 4개 suit 정의와 14개 rank 정의를 조합해 56개 객체를 생성한다.
  return { cards:[...majorCards, ...minorCards], topics, spreads };
})();
if (typeof window !== 'undefined') window.CHUNBONG_TAROT_DATA = CHUNBONG_TAROT_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = CHUNBONG_TAROT_DATA;
```

Major card Korean names must be exactly:
`바보, 마법사, 여사제, 여황제, 황제, 교황, 연인, 전차, 힘, 은둔자, 운명의 수레바퀴, 정의, 매달린 사람, 죽음, 절제, 악마, 탑, 별, 달, 태양, 심판, 세계`.

Minor suits must be exactly `소드, 완드, 컵, 펜타클`; ranks must be `에이스, 2..10, 시종, 기사, 여왕, 왕`.

Every generated card object must include:

```js
{
  id, arcana, number, rank, suit, nameKo, image,
  keywordsUpright, keywordsReversed,
  meaningUpright, meaningReversed,
  topicHints:{daily,concern,love,money,game}
}
```

- [ ] **Step 4: `tarot.js` 순수 로직 구현**

```js
const DATA = typeof module !== 'undefined' && module.exports ? require('./tarot-data.js') : window.CHUNBONG_TAROT_DATA;
function random01(){
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const v = new Uint32Array(1); crypto.getRandomValues(v); return v[0] / 4294967296;
  }
  return Math.random();
}
function shuffleDeck(cards, randomFn=random01){
  const out=[...cards];
  for(let i=out.length-1;i>0;i--){ const j=Math.floor(randomFn()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; }
  return out;
}
function orientationFromRandom(randomFn=random01){ return randomFn() < .5 ? 'upright' : 'reversed'; }
```

`buildCardInterpretation()` must combine card name, position, selected orientation meaning and `topicHints[topicId]`. `buildSummary()` must mention major-card weight, upright/reversed balance and the final card's direction without promising certainty.

- [ ] **Step 5: 데이터/로직 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add tarot-data.js tarot.js tests/tarot-regression.mjs
git commit -m "feat: add tarot deck data and reading logic"
```

---

### Task 3: 타로 페이지 마크업과 인터랙션 연결

**Files:**
- Create: `tarot.html`
- Modify: `tarot.js`
- Test: `tests/tarot-regression.mjs`

**Interfaces:**
- `body[data-page="tarot"]` lets existing `page.js` highlight `data-nav="tarot"`.
- DOM IDs: `tarot-setup`, `tarot-spread-options`, `tarot-question`, `tarot-shuffle`, `tarot-deck`, `tarot-selection-status`, `tarot-results`, `tarot-reading-grid`, `tarot-summary`, `tarot-redraw`, `tarot-reset`.

- [ ] **Step 1: HTML 구조 테스트 추가**

```js
const fs = require('node:fs');
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
for (const token of ['data-page="tarot"','id="tarot-setup"','id="tarot-deck"','id="tarot-results"','tarot-data.js','tarot.js']) {
  assert.ok(html.includes(token), `tarot.html should include ${token}`);
}
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because `tarot.html` is missing.

- [ ] **Step 3: `tarot.html` 작성**

The page must include:

```html
<body data-page="tarot">
...
<form id="tarot-setup" class="tarot-setup">
  <fieldset class="tarot-choice-group" aria-label="타로 주제">...</fieldset>
  <fieldset class="tarot-choice-group" aria-label="카드 수">...</fieldset>
  <fieldset id="tarot-spread-options" class="tarot-choice-group" hidden>...</fieldset>
  <label class="tarot-question-label">질문 <textarea id="tarot-question" maxlength="300"></textarea></label>
  <button id="tarot-shuffle" class="btn btn-primary" type="submit">카드 섞기</button>
</form>
<section class="tarot-stage" aria-live="polite">
  <p id="tarot-selection-status">주제와 카드 수를 선택해 주세요.</p>
  <div id="tarot-deck" class="tarot-deck"></div>
</section>
<section id="tarot-results" class="tarot-results" hidden>
  <div id="tarot-reading-grid" class="tarot-reading-grid"></div>
  <article id="tarot-summary" class="tarot-summary"></article>
  <div class="tarot-result-actions"><button id="tarot-redraw">다시 뽑기</button><button id="tarot-reset">다른 질문 보기</button></div>
  <p class="tarot-disclaimer">타로 결과는 재미와 자기성찰을 위한 참고용입니다. 중요한 결정은 현실의 정보와 판단을 함께 고려해 주세요.</p>
</section>
<script src="content.js"></script><script src="page.js"></script><script src="tarot-data.js"></script><script src="tarot.js"></script>
```

- [ ] **Step 4: DOM 상태 로직 구현**

On submit, read topic/count/spread/question, shuffle all 78 cards, expose 18 CSS card backs from the shuffled deck, and require 1 or 3 user selections. Each selection stores `{card, orientation, position}`; after the required number is selected, render results. Selected card image must load lazily and use an `error` handler that keeps the text interpretation visible while replacing the image area with `이미지를 불러오지 못했습니다.`.

Keyboard support: card backs are `<button type="button">`; Enter/Space therefore work natively. Every card back must have `aria-label="카드 N 선택"`.

- [ ] **Step 5: 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add tarot.html tarot.js tests/tarot-regression.mjs
git commit -m "feat: add interactive tarot reading page"
```

---

### Task 4: 타로 전용 비주얼과 반응형 스타일 추가

**Files:**
- Modify: `styles.css`
- Test: `tests/tarot-regression.mjs`

- [ ] **Step 1: 스타일 요구사항 테스트 추가**

```js
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
for (const token of ['.tarot-stage','.tarot-card-back','.tarot-card-face','.tarot-reading-grid','@media (prefers-reduced-motion: reduce)']) {
  assert.ok(css.includes(token), `styles.css should include ${token}`);
}
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because tarot CSS classes are absent.

- [ ] **Step 3: `styles.css`에 타로 스타일 추가**

Use existing `--orange`, `--orange-2`, `--panel`, `--line` tokens. Required visual rules:

```css
.tarot-stage{position:relative;min-height:420px;padding:34px;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at 50% 20%,#ff6b181d,transparent 45%),#0b0b0b;overflow:hidden}
.tarot-deck{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;perspective:1200px}
.tarot-card-back{width:88px;aspect-ratio:2/3;border:1px solid #ff9d2e70;border-radius:12px;background:repeating-radial-gradient(circle at center,#ff7a181f 0 4px,#111 5px 12px);box-shadow:0 12px 35px #0009;cursor:pointer;transition:transform .22s,border-color .22s}
.tarot-card-back:hover,.tarot-card-back:focus-visible{transform:translateY(-12px) rotate(-1deg);border-color:var(--orange-2)}
.tarot-reading-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.tarot-card-face img{width:100%;aspect-ratio:2/3;object-fit:contain;border-radius:18px;background:#050505}
.tarot-card-face.is-reversed img{transform:rotate(180deg)}
```

Add a shuffle keyframe only to card backs, a 3D result reveal, mobile breakpoints that make the 3-card result grid one column below 700px, and a `prefers-reduced-motion: reduce` override that disables tarot transforms/animations.

- [ ] **Step 4: 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add styles.css tests/tarot-regression.mjs
git commit -m "feat: style tarot reading experience"
```

---

### Task 5: 전체 팬사이트 네비게이션과 메인 포털에 TAROT 연결

**Files:**
- Modify: `index.html`
- Modify: `schedule.html`
- Modify: `notice.html`
- Modify: `vod.html`
- Modify: `clips.html`
- Modify: `fanart.html`
- Modify: `youtube.html`
- Modify: `tarot.html`
- Modify: `styles.css`
- Modify: `tests/multipage-smoke.mjs`
- Test: `tests/tarot-regression.mjs`

- [ ] **Step 1: 멀티페이지 테스트를 TAROT까지 확장**

Update the page list and required href list to:

```js
const pages = ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html'];
for (const page of pages) {
  const html = read(page);
  for (const href of pages) assert.ok(html.includes(href), `${page} should link to ${href}`);
}
```

Also assert `index.html` contains `07 / TAROT`, `타로 보기`, and `href="tarot.html"`.

- [ ] **Step 2: 실패 확인**

Run: `node tests/multipage-smoke.mjs`
Expected: FAIL until every page includes the TAROT navigation link.

- [ ] **Step 3: 모든 공통 네비게이션에 링크 추가**

Insert exactly:

```html
<a data-nav="tarot" href="tarot.html">TAROT</a>
```

between 팬아트 and 유튜브 on all eight pages. Keep `page.js` unchanged because it already activates links by matching `data-nav` against `body.dataset.page`.

- [ ] **Step 4: 메인 포털 카드 추가**

```html
<a class="portal-card reveal" href="tarot.html"><small>07 / TAROT</small><strong>타로 보기</strong><p>78장 풀덱에서 직접 카드를 뽑고 정·역방향 타로 리딩을 확인합니다.</p><b>→</b></a>
```

Change desktop `.portal-grid` from `repeat(5,1fr)` to `repeat(4,1fr)` so seven cards render as 4 + 3, while keeping existing responsive rules.

- [ ] **Step 5: 네비게이션 테스트 실행**

Run: `node tests/multipage-smoke.mjs && node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add index.html schedule.html notice.html vod.html clips.html fanart.html youtube.html tarot.html styles.css tests/multipage-smoke.mjs tests/tarot-regression.mjs
git commit -m "feat: link tarot across fan site navigation"
```

---

### Task 6: CI와 전체 회귀 검증, 배포 확인

**Files:**
- Modify: `.github/workflows/catch-regression.yml`

- [ ] **Step 1: CI에 타로 구문/회귀 테스트 추가**

Add:

```yaml
      - name: Check Tarot syntax
        run: |
          node --check tarot-data.js
          node --check tarot.js
      - name: Run Tarot regressions
        run: |
          node tests/tarot-assets-regression.mjs
          node tests/tarot-regression.mjs
          node tests/multipage-smoke.mjs
```

Do not remove the existing CATCH and single-board notice steps.

- [ ] **Step 2: 로컬 전체 테스트 실행**

Run:

```bash
node --check tarot-data.js
node --check tarot.js
for file in tests/*.mjs; do echo "=== $file ==="; node "$file"; done
```

Expected: all tests exit 0. If an existing unrelated test is stale, investigate and update only when the test contradicts current intentional production behavior; do not weaken CATCH/공지 protections.

- [ ] **Step 3: 자산 최종 확인**

Run:

```bash
find assets/tarot -type f -name '*.webp' | wc -l
find assets/tarot -type f -name '*.webp' -printf '%s\n' | awk '{s+=$1} END {printf "%.2f MB\n",s/1024/1024}'
```

Expected: exactly `78` files and total size below `50 MB`.

- [ ] **Step 4: CI 변경 커밋**

```bash
git add .github/workflows/catch-regression.yml
git commit -m "test: verify tarot feature in site regression workflow"
```

- [ ] **Step 5: GitHub Actions 확인**

After push, verify the `Site regression` workflow finishes with conclusion `success`, including existing Catch source, Catch embed, notice single-board, Tarot assets, Tarot logic, and multipage tests.

- [ ] **Step 6: Vercel 배포 확인**

Verify the final commit has Vercel status `success`. Open `https://chunbong-fansite.vercel.app/tarot.html` and manually check desktop + mobile widths for: setup selection, both 3-card spreads, 1-card reading, card image display, reversed rotation, redraw/reset, keyboard focus, and navigation back to existing pages.

- [ ] **Step 7: 최종 완료 보고**

Report the final commit SHA, CI result, Vercel result, card asset count/size, and live TAROT page URL.
