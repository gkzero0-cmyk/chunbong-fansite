# 춘봉 팬사이트 TAROT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 춘봉 팬사이트에 사용자가 제공한 메이저 22장 + 마이너 56장 이미지로 동작하는 78장 풀덱 타로 기능을 추가한다.

**Architecture:** 기존 정적 멀티페이지 구조는 유지하고 `tarot.html`, `tarot-data.js`, `tarot.js`를 독립 추가한다. 공통 네비게이션은 기존 `page.js`의 `data-page`/`data-nav` 로직을 그대로 사용하며 타로 랜덤, 해석, DOM 상태는 타로 전용 코드에 격리해 공지/CATCH/일정 API와 결합하지 않는다.

**Tech Stack:** HTML5, 기존 `styles.css`, 바닐라 JavaScript, Node.js 회귀 테스트, WebP 정적 이미지, GitHub Actions, Vercel

**Spec:** `docs/superpowers/specs/2026-08-31-tarot-feature-design.md`

## Global Constraints

- AI API, 사용자 계정, 서버 저장, 결제 기능은 추가하지 않는다.
- 입력 ZIP은 `/mnt/data/춘봉 메이저 아르카나(1).zip` 22장과 `/mnt/data/마이너 아르카나.zip` 56장을 사용한다.
- 최종 덱은 정확히 78장이다.
- 정방향/역방향은 카드마다 독립적으로 50% 확률이며 가능한 경우 `crypto.getRandomValues()`를 사용한다.
- 3장 스프레드는 `과거 · 현재 · 미래`와 `상황 · 조언 · 결과`를 모두 제공한다.
- 결과 문구는 가능성과 자기성찰 중심으로 작성하고 확정적 예언 표현은 사용하지 않는다.
- 기존 공지/CATCH/일정 기능을 삭제하거나 재구성하지 않는다.
- 카드 이미지는 원본 비율을 유지한 WebP로 변환하고 긴 변을 최대 1152px로 제한한다.

---

### Task 1: 78장 카드 이미지를 웹 자산으로 준비

**Files:**
- Create: `assets/tarot/major/*.webp`
- Create: `assets/tarot/minor/*.webp`
- Create: `tests/tarot-assets-regression.mjs`

**Interfaces:**
- Produces major paths: `assets/tarot/major/00-fool.webp` through `assets/tarot/major/21-world.webp`
- Produces minor paths: `assets/tarot/minor/{swords|wands|cups|pentacles}-{ace|02|03|04|05|06|07|08|09|10|page|knight|queen|king}.webp`

- [ ] **Step 1: 자산 회귀 테스트 작성**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const majorDir = new URL('assets/tarot/major/', root);
const minorDir = new URL('assets/tarot/minor/', root);
const major = fs.readdirSync(majorDir).filter(name => name.endsWith('.webp')).sort();
const minor = fs.readdirSync(minorDir).filter(name => name.endsWith('.webp')).sort();

assert.equal(major.length, 22, 'major tarot assets must contain 22 WebP files');
assert.equal(minor.length, 56, 'minor tarot assets must contain 56 WebP files');
assert.ok(major.includes('00-fool.webp'));
assert.ok(major.includes('21-world.webp'));
assert.ok(minor.includes('swords-ace.webp'));
assert.ok(minor.includes('wands-page.webp'));
assert.ok(minor.includes('cups-10.webp'));
assert.ok(minor.includes('pentacles-king.webp'));

const files = [
  ...major.map(name => new URL(`assets/tarot/major/${name}`, root)),
  ...minor.map(name => new URL(`assets/tarot/minor/${name}`, root))
];
const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
assert.ok(totalBytes < 50 * 1024 * 1024, 'optimized tarot assets should stay below 50 MB total');
console.log('tarot asset regression test passed');
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/tarot-assets-regression.mjs`
Expected: FAIL because the tarot asset directories do not exist yet.

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
rank_slugs = {
    '에이스':'ace','2':'02','3':'03','4':'04','5':'05','6':'06','7':'07','8':'08','9':'09','10':'10',
    '시종':'page','기사':'knight','여왕':'queen','왕':'king'
}

def save_webp(raw, destination):
    image = Image.open(BytesIO(raw)).convert('RGB')
    width, height = image.size
    scale = min(1.0, 1152 / max(width, height))
    if scale < 1.0:
        image = image.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
    image.save(destination, 'WEBP', quality=82, method=6)

with ZipFile(major_zip) as archive:
    for number, slug in enumerate(major_slugs):
        save_webp(archive.read(f'{number}번.png'), out_major / f'{number:02d}-{slug}.webp')

with ZipFile(minor_zip) as archive:
    for source_name in archive.namelist():
        if not source_name.endswith('.png'):
            continue
        suit_ko, rank_ko = Path(source_name).stem.split(' ', 1)
        destination = out_minor / f'{suit_slugs[suit_ko]}-{rank_slugs[rank_ko]}.webp'
        save_webp(archive.read(source_name), destination)
```

- [ ] **Step 4: 자산 테스트 재실행**

Run: `node tests/tarot-assets-regression.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add assets/tarot tests/tarot-assets-regression.mjs
git commit -m "feat: add optimized tarot card assets"
```

---

### Task 2: 78장 카드 데이터 작성

**Files:**
- Create: `tarot-data.js`
- Create: `tests/tarot-regression.mjs`

**Interfaces:**
- Browser export: `window.CHUNBONG_TAROT_DATA`
- Node export: `module.exports`
- Shape: `{ cards, topics, spreads }`

- [ ] **Step 1: 데이터 테스트 작성**

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

assert.equal(data.cards.length, 78);
assert.equal(data.cards.filter(card => card.arcana === 'major').length, 22);
assert.equal(data.cards.filter(card => card.arcana === 'minor').length, 56);
assert.equal(new Set(data.cards.map(card => card.id)).size, 78);
assert.deepEqual(data.spreads.pastPresentFuture.positions, ['과거','현재','미래']);
assert.deepEqual(data.spreads.situationAdviceOutcome.positions, ['상황','조언','결과']);
for (const card of data.cards) {
  assert.ok(card.nameKo);
  assert.ok(card.meaningUpright);
  assert.ok(card.meaningReversed);
  assert.ok(card.topicHints.daily && card.topicHints.concern && card.topicHints.love && card.topicHints.money && card.topicHints.game);
  assert.ok(fs.existsSync(new URL(card.image, root)), `${card.image} must exist`);
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because `tarot-data.js` does not exist.

- [ ] **Step 3: 공통 데이터 정의**

`tarot-data.js` starts with these exact topic and spread definitions:

```js
const CHUNBONG_TAROT_DATA = (() => {
  const topics = {
    daily:{label:'오늘의 타로'},
    concern:{label:'고민 상담'},
    love:{label:'연애운'},
    money:{label:'금전운'},
    game:{label:'방송·게임운'}
  };
  const spreads = {
    single:{label:'한 장 메시지',positions:['메시지']},
    pastPresentFuture:{label:'과거 · 현재 · 미래',positions:['과거','현재','미래']},
    situationAdviceOutcome:{label:'상황 · 조언 · 결과',positions:['상황','조언','결과']}
  };
```

Define the 22 major seeds exactly as follows; `up` and `rev` are used as both keywords and the base of the meaning sentence:

```js
  const majorSeeds = [
    ['바보','새로운 시작, 자유, 가능성','무모함, 준비 부족, 산만함'],
    ['마법사','의지, 실행력, 자원 활용','집중 부족, 조작, 재능 낭비'],
    ['여사제','직관, 내면의 지혜, 관찰','직관 무시, 비밀, 혼란'],
    ['여황제','풍요, 돌봄, 창조성','과잉 보호, 정체, 자기 돌봄 부족'],
    ['황제','질서, 책임, 안정','경직, 통제 과잉, 권위 충돌'],
    ['교황','전통, 배움, 조언','고정관념, 반항, 독자적 선택'],
    ['연인','관계, 선택, 조화','불균형, 가치 충돌, 망설임'],
    ['전차','전진, 의지, 승부욕','방향 상실, 성급함, 제어 부족'],
    ['힘','용기, 인내, 부드러운 통제','자신감 저하, 감정 소모, 억압'],
    ['은둔자','성찰, 탐구, 혼자만의 시간','고립, 회피, 과도한 고민'],
    ['운명의 수레바퀴','전환점, 흐름, 기회','지연, 반복, 변화 저항'],
    ['정의','균형, 책임, 공정한 판단','불공정, 책임 회피, 편향'],
    ['매달린 사람','관점 전환, 기다림, 내려놓음','정체, 희생 강박, 미련'],
    ['죽음','종료, 변화, 재출발','변화 거부, 미련, 장기 정체'],
    ['절제','조율, 균형, 회복','과잉, 불균형, 조급함'],
    ['악마','욕망, 집착 인식, 현실적 유혹','속박 해제, 거리두기, 자각'],
    ['탑','급변, 진실 드러남, 구조 재편','변화 회피, 불안 누적, 충격 완화'],
    ['별','희망, 회복, 영감','낙담, 자신감 저하, 기대 조정'],
    ['달','감정, 상상력, 불확실성','혼란 해소, 진실 확인, 두려움 직면'],
    ['태양','성취, 활력, 명확함','과신, 지연된 기쁨, 에너지 소모'],
    ['심판','각성, 결단, 재평가','자기 의심, 결단 지연, 과거 집착'],
    ['세계','완성, 통합, 다음 단계','미완성, 마무리 부족, 지연']
  ];
```

Define minor suit seeds exactly:

```js
  const suitSeeds = [
    {id:'swords',ko:'소드',focus:'생각과 판단',up:'논리적으로 상황을 정리하고 필요한 결정을 내릴 흐름',rev:'생각이 복잡해져 판단을 서두르지 않는 편이 좋은 흐름'},
    {id:'wands',ko:'완드',focus:'열정과 행동',up:'의욕을 행동으로 옮기며 추진력을 살릴 흐름',rev:'에너지 분산과 성급함을 조절할 필요가 있는 흐름'},
    {id:'cups',ko:'컵',focus:'감정과 관계',up:'감정과 관계의 신호를 솔직하게 받아들일 흐름',rev:'감정 과잉이나 오해를 정리하며 균형을 찾을 흐름'},
    {id:'pentacles',ko:'펜타클',focus:'현실과 자원',up:'시간과 돈, 실질적인 기반을 차분히 쌓을 흐름',rev:'자원 배분과 현실적 우선순위를 재점검할 흐름'}
  ];
```

Define rank seeds exactly:

```js
  const rankSeeds = [
    {id:'ace',ko:'에이스',up:'새로운 가능성이 열리고 첫 행동이 중요합니다.',rev:'출발이 늦어지거나 준비를 다시 점검할 필요가 있습니다.'},
    {id:'02',ko:'2',up:'두 선택지 사이에서 균형과 방향 설정이 중요합니다.',rev:'결정을 미루기보다 기준을 다시 세울 필요가 있습니다.'},
    {id:'03',ko:'3',up:'협력과 확장이 성과를 키우는 시기입니다.',rev:'협업의 엇갈림이나 기대 차이를 조율할 필요가 있습니다.'},
    {id:'04',ko:'4',up:'안정과 기반을 지키며 숨을 고르는 흐름입니다.',rev:'안전에만 머물러 변화 기회를 놓치지 않는지 살펴야 합니다.'},
    {id:'05',ko:'5',up:'긴장과 경쟁 속에서 중요한 교훈을 얻는 흐름입니다.',rev:'소모적인 충돌을 줄이고 회복할 방법을 찾을 필요가 있습니다.'},
    {id:'06',ko:'6',up:'회복과 이동, 균형 회복이 진행되는 흐름입니다.',rev:'과거의 패턴이 발목을 잡지 않는지 점검할 필요가 있습니다.'},
    {id:'07',ko:'7',up:'자신의 기준을 지키며 전략적으로 대응할 때입니다.',rev:'방어가 과도해지거나 방향이 흔들리는 부분을 살펴야 합니다.'},
    {id:'08',ko:'8',up:'속도와 집중이 붙어 빠르게 진전될 가능성이 있습니다.',rev:'지연과 과부하를 줄이기 위해 순서를 정리할 필요가 있습니다.'},
    {id:'09',ko:'9',up:'지금까지의 경험과 인내가 힘이 되는 시기입니다.',rev:'피로와 경계심이 지나치지 않은지 회복을 우선해야 합니다.'},
    {id:'10',ko:'10',up:'한 주기가 완성되며 책임과 결과가 분명해지는 흐름입니다.',rev:'부담을 혼자 떠안지 말고 정리와 분담이 필요한 시기입니다.'},
    {id:'page',ko:'시종',up:'새 소식과 배움, 가벼운 시도가 가능성을 엽니다.',rev:'미숙한 판단이나 확인되지 않은 정보에 주의할 필요가 있습니다.'},
    {id:'knight',ko:'기사',up:'행동력과 추진력이 강해져 직접 움직일 때입니다.',rev:'속도만 앞서지 않도록 목적과 방법을 다시 맞춰야 합니다.'},
    {id:'queen',ko:'여왕',up:'성숙한 이해와 안정적인 관리 능력이 빛나는 흐름입니다.',rev:'감정이나 기준이 한쪽으로 치우치지 않는지 살펴야 합니다.'},
    {id:'king',ko:'왕',up:'책임 있는 판단과 주도권을 발휘할 수 있는 흐름입니다.',rev:'통제 욕구나 완고함보다 유연한 판단이 필요한 시기입니다.'}
  ];
```

- [ ] **Step 4: 78장 객체 생성**

Use these exact helper rules:

```js
  const topicHints = focus => ({
    daily:`오늘은 ${focus}에 특히 주의를 두면 흐름을 읽기 쉽습니다.`,
    concern:`고민의 핵심을 ${focus} 관점에서 다시 정리해 보세요.`,
    love:`연애와 관계에서는 ${focus}을 솔직하고 현실적으로 바라보는 것이 도움이 됩니다.`,
    money:`금전 문제에서는 ${focus}과 연결된 선택을 수치와 우선순위로 확인해 보세요.`,
    game:`방송·게임에서는 ${focus}을 기준으로 페이스와 판단을 조절해 보세요.`
  });

  const majorSlugs = ['fool','magician','high-priestess','empress','emperor','hierophant','lovers','chariot','strength','hermit','wheel-of-fortune','justice','hanged-man','death','temperance','devil','tower','star','moon','sun','judgement','world'];
  const majorCards = majorSeeds.map(([nameKo, up, rev], number) => ({
    id:`major-${String(number).padStart(2,'0')}`,
    arcana:'major', number, rank:'', suit:'', nameKo,
    image:`assets/tarot/major/${String(number).padStart(2,'0')}-${majorSlugs[number]}.webp`,
    keywordsUpright:up, keywordsReversed:rev,
    meaningUpright:`${nameKo} 정방향은 ${up}을 중심으로 상황을 바라보라는 메시지입니다.`,
    meaningReversed:`${nameKo} 역방향은 ${rev}을 점검하며 속도를 조절하라는 메시지입니다.`,
    topicHints:topicHints('큰 흐름과 선택')
  }));

  const minorCards = suitSeeds.flatMap(suit => rankSeeds.map(rank => ({
    id:`${suit.id}-${rank.id}`,
    arcana:'minor', number:null, rank:rank.ko, suit:suit.ko,
    nameKo:`${suit.ko} ${rank.ko}`,
    image:`assets/tarot/minor/${suit.id}-${rank.id}.webp`,
    keywordsUpright:`${suit.focus}, ${rank.up.split('.')[0]}`,
    keywordsReversed:`${suit.focus} 재조정, ${rank.rev.split('.')[0]}`,
    meaningUpright:`${rank.up} ${suit.up}.`,
    meaningReversed:`${rank.rev} ${suit.rev}.`,
    topicHints:topicHints(suit.focus)
  })));

  return { cards:[...majorCards, ...minorCards], topics, spreads };
})();
if (typeof window !== 'undefined') window.CHUNBONG_TAROT_DATA = CHUNBONG_TAROT_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = CHUNBONG_TAROT_DATA;
```

- [ ] **Step 5: 데이터 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS for all data assertions.

- [ ] **Step 6: 커밋**

```bash
git add tarot-data.js tests/tarot-regression.mjs
git commit -m "feat: add 78-card tarot data"
```

---

### Task 3: 순수 랜덤/해석 로직 작성

**Files:**
- Create: `tarot.js`
- Modify: `tests/tarot-regression.mjs`

**Interfaces:**
- Produces `random01()`, `shuffleDeck(cards, randomFn)`, `orientationFromRandom(randomFn)`, `buildCardInterpretation(selection, topicId, position)`, `buildSummary(selections, topicId, spreadId)`.

- [ ] **Step 1: 순수 로직 테스트 추가**

```js
const tarot = require('../tarot.js');
const deterministic = (() => {
  const values = [0.99,0.01,0.75,0.25,0.6,0.4];
  let index = 0;
  return () => values[index++ % values.length];
})();
const shuffled = tarot.shuffleDeck(data.cards.slice(0, 8), deterministic);
assert.equal(new Set(shuffled.map(card => card.id)).size, 8);
assert.equal(tarot.orientationFromRandom(() => 0.1), 'upright');
assert.equal(tarot.orientationFromRandom(() => 0.9), 'reversed');
const sample = {card:data.cards[0],orientation:'upright'};
assert.ok(tarot.buildCardInterpretation(sample,'daily','현재').includes(data.cards[0].nameKo));
assert.ok(tarot.buildSummary([sample],'daily','single').includes('가능성'));
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because `tarot.js` does not exist.

- [ ] **Step 3: 랜덤과 해석 구현**

```js
const DATA = typeof module !== 'undefined' && module.exports ? require('./tarot-data.js') : window.CHUNBONG_TAROT_DATA;

function random01(){
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function shuffleDeck(cards, randomFn=random01){
  const result = [...cards];
  for (let index=result.length-1; index>0; index-=1) {
    const target = Math.floor(randomFn() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function orientationFromRandom(randomFn=random01){
  return randomFn() < 0.5 ? 'upright' : 'reversed';
}

function buildCardInterpretation(selection, topicId, position){
  const {card, orientation} = selection;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
  const hint = card.topicHints[topicId] || card.topicHints.daily;
  return `${position}의 ${card.nameKo} ${direction}. ${meaning} ${hint}`;
}

function buildSummary(selections, topicId, spreadId){
  const majorCount = selections.filter(item => item.card.arcana === 'major').length;
  const reversedCount = selections.filter(item => item.orientation === 'reversed').length;
  const finalCard = selections[selections.length - 1].card;
  const topic = DATA.topics[topicId]?.label || '타로';
  const spread = DATA.spreads[spreadId]?.label || '한 장 메시지';
  const scaleText = majorCount >= 2 ? '큰 방향 전환이나 중요한 선택이 중심에 놓일 가능성이 있습니다.' : '일상적인 선택과 태도 조정이 흐름을 바꾸는 열쇠가 될 가능성이 있습니다.';
  const balanceText = reversedCount >= Math.ceil(selections.length / 2) ? '지금은 밀어붙이기보다 막힌 지점과 내면의 부담을 먼저 정리하는 편이 좋습니다.' : '현재 흐름은 비교적 바깥으로 움직이기 쉬우므로 작은 행동부터 확인해 볼 수 있습니다.';
  return `${topic} · ${spread} 리딩입니다. ${scaleText} ${balanceText} 마지막 카드인 ${finalCard.nameKo}의 메시지를 결론이 아니라 다음 선택을 점검하는 기준으로 활용해 보세요. 결과는 하나의 가능성으로 참고하는 것이 좋습니다.`;
}
```

Export for Node and expose browser API:

```js
const TAROT_API = {random01,shuffleDeck,orientationFromRandom,buildCardInterpretation,buildSummary};
if (typeof window !== 'undefined') window.CHUNBONG_TAROT = TAROT_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_API;
```

- [ ] **Step 4: 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add tarot.js tests/tarot-regression.mjs
git commit -m "feat: add tarot reading engine"
```

---

### Task 4: 타로 페이지와 브라우저 상태 흐름 구현

**Files:**
- Create: `tarot.html`
- Modify: `tarot.js`
- Modify: `tests/tarot-regression.mjs`

**Interfaces:**
- Required DOM IDs: `tarot-setup`, `tarot-spread-options`, `tarot-question`, `tarot-shuffle`, `tarot-deck`, `tarot-selection-status`, `tarot-results`, `tarot-reading-grid`, `tarot-summary`, `tarot-redraw`, `tarot-reset`.
- `body[data-page="tarot"]` integrates with existing `page.js` navigation highlighting.

- [ ] **Step 1: HTML 구조 테스트 추가**

```js
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
for (const token of [
  'data-page="tarot"','id="tarot-setup"','id="tarot-spread-options"','id="tarot-question"',
  'id="tarot-deck"','id="tarot-results"','id="tarot-reading-grid"','id="tarot-summary"',
  'tarot-data.js','tarot.js'
]) assert.ok(html.includes(token), `tarot.html should include ${token}`);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because `tarot.html` does not exist.

- [ ] **Step 3: `tarot.html` 작성**

Reuse the existing site header/footer markup, set `<body data-page="tarot">`, and make the page `<main>` exactly this structure:

```html
<main class="tarot-page">
  <section class="page-hero tarot-hero"><div class="page-shell reveal">
    <p class="kicker">07 / TAROT</p><h1>춘봉 타로</h1>
    <p>78장 풀덱에서 직접 카드를 고르고, 정방향·역방향 메시지를 확인해 보세요.</p>
  </div></section>
  <section class="content-section"><div class="page-shell tarot-shell">
    <form id="tarot-setup" class="tarot-setup reveal">
      <fieldset class="tarot-choice-group"><legend>무엇을 볼까요?</legend>
        <label><input type="radio" name="topic" value="daily" checked>오늘의 타로</label>
        <label><input type="radio" name="topic" value="concern">고민 상담</label>
        <label><input type="radio" name="topic" value="love">연애운</label>
        <label><input type="radio" name="topic" value="money">금전운</label>
        <label><input type="radio" name="topic" value="game">방송·게임운</label>
      </fieldset>
      <fieldset class="tarot-choice-group"><legend>몇 장을 뽑을까요?</legend>
        <label><input type="radio" name="count" value="1" checked>1장</label>
        <label><input type="radio" name="count" value="3">3장</label>
      </fieldset>
      <fieldset id="tarot-spread-options" class="tarot-choice-group" hidden><legend>3장 스프레드</legend>
        <label><input type="radio" name="spread" value="pastPresentFuture" checked>과거 · 현재 · 미래</label>
        <label><input type="radio" name="spread" value="situationAdviceOutcome">상황 · 조언 · 결과</label>
      </fieldset>
      <label class="tarot-question-label" for="tarot-question">질문 또는 고민 <span>선택 입력</span></label>
      <textarea id="tarot-question" maxlength="300" placeholder="예: 지금 준비 중인 일을 계속 밀어도 괜찮을까?"></textarea>
      <button id="tarot-shuffle" class="btn btn-primary" type="submit">카드 섞기</button>
    </form>
    <section class="tarot-stage reveal" aria-live="polite">
      <p id="tarot-selection-status">주제와 카드 수를 선택한 뒤 카드를 섞어 주세요.</p>
      <div id="tarot-deck" class="tarot-deck"></div>
    </section>
    <section id="tarot-results" class="tarot-results" hidden>
      <div id="tarot-reading-grid" class="tarot-reading-grid"></div>
      <article id="tarot-summary" class="tarot-summary"></article>
      <div class="tarot-result-actions">
        <button id="tarot-redraw" class="btn btn-primary" type="button">다시 뽑기</button>
        <button id="tarot-reset" class="btn btn-ghost" type="button">다른 질문 보기</button>
      </div>
      <p class="tarot-disclaimer">타로 결과는 재미와 자기성찰을 위한 참고용입니다. 중요한 결정은 현실의 정보와 판단을 함께 고려해 주세요.</p>
    </section>
  </div></section>
</main>
```

Script order at the end of the page:

```html
<script src="content.js"></script>
<script src="page.js"></script>
<script src="tarot-data.js"></script>
<script src="tarot.js"></script>
```

- [ ] **Step 4: 브라우저 상태와 카드 선택 로직 추가**

Append DOM initialization to `tarot.js` behind `if (typeof document !== 'undefined')` so Node tests keep working. Use exactly this state shape and flow:

```js
const state = {topic:'daily',count:1,spreadId:'single',question:'',deck:[],selected:[]};
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function readSetup(){
  const form = byId('tarot-setup');
  const count = Number(new FormData(form).get('count') || 1);
  return {
    topic:String(new FormData(form).get('topic') || 'daily'),
    count,
    spreadId:count === 3 ? String(new FormData(form).get('spread') || 'pastPresentFuture') : 'single',
    question:byId('tarot-question').value.trim()
  };
}

function startReading(){
  Object.assign(state, readSetup());
  state.deck = shuffleDeck(DATA.cards);
  state.selected = [];
  byId('tarot-results').hidden = true;
  renderDeck();
}

function renderDeck(){
  const visible = state.deck.slice(0,18);
  byId('tarot-deck').innerHTML = visible.map((card,index) =>
    `<button class="tarot-card-back" type="button" data-card-index="${index}" aria-label="카드 ${index+1} 선택"><span>CB</span></button>`
  ).join('');
  byId('tarot-selection-status').textContent = `${state.count}장 중 0장을 선택했습니다.`;
}

function selectCard(button){
  if (state.selected.length >= state.count || button.disabled) return;
  const index = Number(button.dataset.cardIndex);
  const card = state.deck[index];
  const positions = DATA.spreads[state.spreadId].positions;
  state.selected.push({card,orientation:orientationFromRandom(),position:positions[state.selected.length]});
  button.disabled = true;
  button.classList.add('selected');
  byId('tarot-selection-status').textContent = `${state.count}장 중 ${state.selected.length}장을 선택했습니다.`;
  if (state.selected.length === state.count) renderResults();
}
```

`renderResults()` must use this template so image fallback and text interpretation both exist:

```js
function renderResults(){
  byId('tarot-reading-grid').innerHTML = state.selected.map(selection => {
    const reversed = selection.orientation === 'reversed';
    const direction = reversed ? '역방향' : '정방향';
    const meaning = buildCardInterpretation(selection,state.topic,selection.position);
    return `<article class="tarot-card-result">
      <p class="tarot-position">${escapeHtml(selection.position)}</p>
      <div class="tarot-card-face ${reversed ? 'is-reversed' : ''}">
        <img src="${escapeHtml(selection.card.image)}" alt="${escapeHtml(selection.card.nameKo)} ${direction}" loading="lazy">
        <p class="tarot-image-error" hidden>이미지를 불러오지 못했습니다.</p>
      </div>
      <div class="tarot-card-copy"><small>${direction}</small><h2>${escapeHtml(selection.card.nameKo)}</h2><p>${escapeHtml(meaning)}</p></div>
    </article>`;
  }).join('');
  byId('tarot-summary').innerHTML = `<h2>전체 리딩</h2>${state.question ? `<p class="tarot-question-result">질문 · ${escapeHtml(state.question)}</p>` : ''}<p>${escapeHtml(buildSummary(state.selected,state.topic,state.spreadId))}</p>`;
  byId('tarot-results').hidden = false;
  byId('tarot-results').querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
    image.hidden = true;
    image.nextElementSibling.hidden = false;
  }, {once:true}));
  byId('tarot-results').scrollIntoView({behavior:'smooth',block:'start'});
}
```

Bindings:

```js
byId('tarot-setup').addEventListener('change', event => {
  if (event.target.name === 'count') byId('tarot-spread-options').hidden = event.target.value !== '3';
});
byId('tarot-setup').addEventListener('submit', event => { event.preventDefault(); startReading(); });
byId('tarot-deck').addEventListener('click', event => {
  const button = event.target.closest('[data-card-index]');
  if (button) selectCard(button);
});
byId('tarot-redraw').addEventListener('click', startReading);
byId('tarot-reset').addEventListener('click', () => {
  state.deck = []; state.selected = [];
  byId('tarot-deck').innerHTML = '';
  byId('tarot-results').hidden = true;
  byId('tarot-selection-status').textContent = '주제와 카드 수를 선택한 뒤 카드를 섞어 주세요.';
  byId('tarot-setup').scrollIntoView({behavior:'smooth',block:'start'});
});
```

- [ ] **Step 5: 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add tarot.html tarot.js tests/tarot-regression.mjs
git commit -m "feat: add interactive tarot reading page"
```

---

### Task 5: 타로 전용 비주얼과 반응형 스타일 추가

**Files:**
- Modify: `styles.css`
- Modify: `tests/tarot-regression.mjs`

- [ ] **Step 1: 스타일 회귀 테스트 추가**

```js
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
for (const token of ['.tarot-stage','.tarot-card-back','.tarot-card-face','.tarot-reading-grid','@keyframes tarotShuffle','@media (prefers-reduced-motion: reduce)']) {
  assert.ok(css.includes(token), `styles.css should include ${token}`);
}
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/tarot-regression.mjs`
Expected: FAIL because tarot CSS classes are absent.

- [ ] **Step 3: `styles.css`에 타로 스타일 추가**

Append these rules and preserve existing site tokens:

```css
.tarot-page{position:relative;overflow:hidden}.tarot-hero:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 40%,#ff6b1815,transparent 32%),radial-gradient(circle at 80% 20%,#ff9d2e10,transparent 30%);pointer-events:none}.tarot-shell{display:grid;gap:24px}.tarot-setup{display:grid;gap:20px;padding:26px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(160deg,#15100d,#0c0c0c)}.tarot-choice-group{display:flex;flex-wrap:wrap;gap:10px;border:0;padding:0;margin:0}.tarot-choice-group legend{width:100%;font-weight:900;margin-bottom:8px}.tarot-choice-group label{display:flex;align-items:center;gap:7px;padding:10px 13px;border:1px solid #38322f;border-radius:999px;background:#111;cursor:pointer}.tarot-choice-group label:has(input:checked){border-color:var(--orange);background:#ff6b181a;color:var(--orange-2)}.tarot-question-label{font-weight:900}.tarot-question-label span{font-size:11px;color:var(--muted);font-weight:600}.tarot-setup textarea{width:100%;min-height:110px;resize:vertical;border:1px solid #37302d;border-radius:16px;background:#090909;color:#fff;padding:15px}.tarot-stage{position:relative;min-height:420px;padding:34px;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at 50% 20%,#ff6b181d,transparent 45%),#0b0b0b;overflow:hidden}.tarot-stage>p{text-align:center;color:var(--muted);margin:0 0 28px}.tarot-deck{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;perspective:1200px}.tarot-card-back{width:88px;aspect-ratio:2/3;border:1px solid #ff9d2e70;border-radius:12px;background:repeating-radial-gradient(circle at center,#ff7a181f 0 4px,#111 5px 12px);box-shadow:0 12px 35px #0009;cursor:pointer;transition:transform .22s,border-color .22s;animation:tarotShuffle .55s both}.tarot-card-back span{display:grid;place-items:center;width:100%;height:100%;font-size:18px;font-weight:1000;color:#ff9d2e88}.tarot-card-back:hover,.tarot-card-back:focus-visible{transform:translateY(-12px) rotate(-1deg);border-color:var(--orange-2);outline:2px solid #ff9d2e55;outline-offset:3px}.tarot-card-back.selected{opacity:.28;transform:translateY(8px);cursor:default}.tarot-results{display:grid;gap:22px;scroll-margin-top:100px}.tarot-reading-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.tarot-reading-grid:has(.tarot-card-result:only-child){grid-template-columns:minmax(260px,420px);justify-content:center}.tarot-card-result{padding:18px;border:1px solid #322d29;border-radius:24px;background:#0d0d0d;animation:tarotReveal .55s ease both}.tarot-position{color:var(--orange-2);font-size:12px;font-weight:900;letter-spacing:.12em}.tarot-card-face{position:relative;display:grid;place-items:center;min-height:280px}.tarot-card-face img{width:100%;aspect-ratio:2/3;object-fit:contain;border-radius:18px;background:#050505;box-shadow:0 18px 50px #000b}.tarot-card-face.is-reversed img{transform:rotate(180deg)}.tarot-image-error{display:grid;place-items:center;min-height:280px;width:100%;border:1px dashed #444;border-radius:18px;color:var(--muted)}.tarot-card-copy small{color:var(--orange-2);font-weight:900}.tarot-card-copy h2{margin:4px 0 8px}.tarot-card-copy p{color:#c8c1bb}.tarot-summary{padding:24px;border:1px solid #ff6b183b;border-radius:22px;background:linear-gradient(135deg,#21120b,#0c0c0c)}.tarot-summary h2{margin-top:0}.tarot-question-result{color:var(--orange-2);font-weight:800}.tarot-result-actions{display:flex;flex-wrap:wrap;gap:10px}.tarot-disclaimer{color:#817a74;font-size:12px}.tarot-result-actions button{border:1px solid #353535}.tarot-result-actions .btn-primary{border:0}
@keyframes tarotShuffle{0%{opacity:0;transform:translateY(35px) rotate(8deg)}65%{opacity:1;transform:translateY(-7px) rotate(-3deg)}100%{opacity:1;transform:none}}
@keyframes tarotReveal{0%{opacity:0;transform:rotateY(80deg) translateY(14px)}100%{opacity:1;transform:none}}
@media(max-width:700px){.tarot-stage{padding:22px 14px;min-height:360px}.tarot-card-back{width:64px}.tarot-reading-grid,.tarot-reading-grid:has(.tarot-card-result:only-child){grid-template-columns:1fr}.tarot-card-result{padding:14px}.tarot-result-actions .btn{flex:1}}
@media (prefers-reduced-motion: reduce){.tarot-card-back,.tarot-card-result{animation:none!important}.tarot-card-back,.tarot-card-back:hover,.tarot-card-back:focus-visible{transform:none!important;transition:none!important}.tarot-results{scroll-behavior:auto}}
```

- [ ] **Step 4: 스타일 테스트 재실행**

Run: `node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add styles.css tests/tarot-regression.mjs
git commit -m "feat: style tarot reading experience"
```

---

### Task 6: 전체 팬사이트 네비게이션과 메인 포털에 TAROT 연결

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
- Modify: `tests/tarot-regression.mjs`

- [ ] **Step 1: 멀티페이지 테스트를 8페이지로 확장**

```js
const pages = ['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html'];
for (const page of pages) {
  assert.ok(fs.existsSync(new URL(page, root)), `${page} should exist`);
  const html = read(page);
  for (const href of pages) assert.ok(html.includes(href), `${page} should link to ${href}`);
  assert.ok(html.includes('styles.css'), `${page} should use shared styles`);
}
const index = read('index.html');
assert.ok(index.includes('07 / TAROT'));
assert.ok(index.includes('타로 보기'));
assert.ok(index.includes('href="tarot.html"'));
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/multipage-smoke.mjs`
Expected: FAIL until every page includes the TAROT link and the smoke test knows about YouTube/TAROT.

- [ ] **Step 3: 모든 네비게이션에 링크 추가**

Insert exactly between 팬아트 and 유튜브 on all eight pages:

```html
<a data-nav="tarot" href="tarot.html">TAROT</a>
```

Do not modify `page.js`; its existing `link.dataset.nav === document.body.dataset.page` logic already activates TAROT when `body[data-page="tarot"]` is present.

- [ ] **Step 4: 메인 포털 카드 추가**

Insert after YouTube or before the official link strip:

```html
<a class="portal-card reveal" href="tarot.html"><small>07 / TAROT</small><strong>타로 보기</strong><p>78장 풀덱에서 직접 카드를 뽑고 정·역방향 타로 리딩을 확인합니다.</p><b>→</b></a>
```

Update the home description so it mentions 타로, and change desktop `.portal-grid` from `repeat(5,1fr)` to `repeat(4,1fr)` so seven cards render 4 + 3 without an isolated sixth/seventh card.

- [ ] **Step 5: 네비게이션 테스트 실행**

Run: `node tests/multipage-smoke.mjs && node tests/tarot-regression.mjs`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add index.html schedule.html notice.html vod.html clips.html fanart.html youtube.html tarot.html styles.css tests/multipage-smoke.mjs tests/tarot-regression.mjs
git commit -m "feat: link tarot across fan site navigation"
```

---

### Task 7: CI, 전체 회귀, 배포 검증

**Files:**
- Modify: `.github/workflows/catch-regression.yml`

- [ ] **Step 1: CI에 타로 검사 추가**

Keep all existing steps and append:

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

- [ ] **Step 2: 전체 테스트를 새로 실행**

```bash
node --check tarot-data.js
node --check tarot.js
for file in tests/*.mjs; do echo "=== $file ==="; node "$file"; done
```

Expected: every command exits 0. If an old test fails, inspect whether the failure is caused by the TAROT change; do not weaken current CATCH source protections or the `126448625` notice-board filter to make unrelated tests green.

- [ ] **Step 3: 카드 자산 최종 검사**

```bash
find assets/tarot -type f -name '*.webp' | wc -l
find assets/tarot -type f -name '*.webp' -printf '%s\n' | awk '{sum+=$1} END {printf "%.2f MB\n",sum/1024/1024}'
```

Expected: first command prints `78`; second command prints a value below `50.00 MB`.

- [ ] **Step 4: CI 변경 커밋**

```bash
git add .github/workflows/catch-regression.yml
git commit -m "test: verify tarot feature in site regression workflow"
```

- [ ] **Step 5: GitHub Actions 확인**

Verify the final `Site regression` run is `completed / success` and specifically confirm success for Catch source, Catch embed, notice single-board, Tarot syntax, Tarot asset, Tarot logic and multipage smoke steps.

- [ ] **Step 6: Vercel 확인**

Verify the final commit has Vercel status `success`. Open `https://chunbong-fansite.vercel.app/tarot.html` and manually verify: 1장 리딩, 3장 `과거·현재·미래`, 3장 `상황·조언·결과`, 정/역방향 이미지 회전, 다시 뽑기, 다른 질문 보기, 이미지 fallback, 키보드 포커스, 모바일 1열 결과, 기존 공지/CATCH 페이지 이동.

- [ ] **Step 7: 완료 보고**

Report final commit SHA, GitHub Actions result, Vercel result, optimized card count/total size and live TAROT page URL.
