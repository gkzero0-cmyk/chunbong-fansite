# 팬사이트 전역 시각 시스템 통일 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈에서 확정한 기능별 색·아이콘·텍스트 대비 체계를 헤더, 각 페이지, 최근 업데이트, 검색, MY 팬허브, 춘봉 데이터 그래프까지 일관되게 확장한다.

**Architecture:** `site-design-system.css`를 전역 토큰과 공통 category UI의 단일 소스로 만들고 `site-shell.js`가 모든 공통 헤더 페이지에 이를 주입한다. 기존 페이지별 CSS는 구조를 유지하면서 전역 토큰을 참조하도록 바꾸고, 기능 분류가 필요한 JS는 공통 `data-kind` key를 DOM에 노출한다. 데이터 그래프는 기존 SVG renderer를 유지하되 native SVG title tooltip을 제거해 custom tooltip 하나로 통일한다.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 22 regression tests, Playwright browser smoke, GitHub Actions, Vercel

**Spec:** `docs/superpowers/specs/2026-09-21-sitewide-visual-system-design.md`

## Global Constraints

- 기존 기능, 정보 구조, URL, 데이터 로딩 방식은 유지한다.
- 외부 아이콘 라이브러리를 추가하지 않는다.
- 게임 내부 보드 색상과 타로 카드 아트/foil 효과는 변경하지 않는다.
- 실제 제목/본문은 기능색이 아니라 고대비 중립 텍스트 토큰을 사용한다.
- 색만으로 current/active/type 상태를 전달하지 않는다.
- 라이트와 다크는 동일 hue 계열을 쓰되 라이트에서는 더 진한 기능색을 사용한다.
- SVG 그래프의 데이터 계산과 값 포맷은 변경하지 않는다.
- 모바일 58px 헤더와 PWA bottom navigation 레이아웃을 유지한다.
- Node.js 22.x 호환을 유지한다.

## Review Focus

- **라이트 모드 밝은 배경:** 기능 라벨과 보조 텍스트가 흰색/아이보리 배경에 묻히지 않아야 한다. Task 1/2/7에서 dark/light computed style을 검증한다.
- **드롭다운 open vs current:** hover/open이 current page의 주황 채움과 혼동되지 않아야 한다. Task 2에서 HOME, vod, tarot, data를 검증한다.
- **최근 업데이트 thumb 유무:** thumb가 없는 항목은 기능 아이콘, thumb가 있는 항목은 이미지 유지 + meta accent를 사용한다. Task 5에서 두 경우를 모두 검증한다.
- **그래프 경계 포인트:** 첫/마지막 custom tooltip이 viewBox 밖으로 잘리지 않아야 한다. Task 6에서 양 끝 포인트 focus를 검증한다.
- **기존 페이지 CSS 우선순위:** page CSS hardcode가 새 text/category token을 덮지 않아야 한다. Task 7/8에서 주요 진입점 전체를 점검한다.

---

### Task 1: 전역 디자인 토큰과 기능 분류 primitive

**Files:**
- Create: `site-design-system.css`
- Modify: `site-shell.js`
- Create: `tests/site-design-system-regression.mjs`
- Modify: `tests/site-quality-regression.mjs`

**Interfaces:**
- Consumes: `html[data-theme]`, 기존 `data-kind`
- Produces: text tokens, 11 category accent tokens, `.category-accent[data-kind]`

- [ ] **Step 1: failing regression을 작성한다**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../site-design-system.css',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
for(const token of [
  '--text-primary','--text-secondary','--text-muted','--text-meta','--text-disabled',
  '--accent-schedule','--accent-notice','--accent-replay','--accent-clips','--accent-fanart',
  '--accent-youtube','--accent-tarot','--accent-minigames','--accent-history','--accent-data','--accent-calendar'
]) assert.ok(css.includes(token+':'),token+' missing');
assert.match(css,/\[data-theme="light"\]/);
assert.match(css,/\.category-accent\[data-kind="calendar"\]/);
assert.match(shell,/site-design-system\.css/);
console.log('site design system regression passed');
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/site-design-system-regression.mjs`  
Expected: FAIL because the shared CSS file does not exist.

- [ ] **Step 3: `site-design-system.css`를 만든다**

```css
:root{
  --text-primary:#F8F5F2;--text-secondary:#D1CBC5;--text-muted:#AAA29B;--text-meta:#88817B;--text-disabled:#68635F;
  --accent-schedule:#4ADE80;--accent-notice:#FF8A3D;--accent-replay:#4CC9FF;--accent-clips:#668CFF;
  --accent-fanart:#FF82C6;--accent-youtube:#FF6464;--accent-tarot:#B58AFF;--accent-minigames:#FFD05A;
  --accent-history:#AEB9C8;--accent-data:#48E0C2;--accent-calendar:#B7E75C;
}
[data-theme="light"]{
  --text-primary:#1D1815;--text-secondary:#4B433D;--text-muted:#69605A;--text-meta:#827971;--text-disabled:#A49C95;
  --accent-schedule:#168447;--accent-notice:#C9500A;--accent-replay:#0876A8;--accent-clips:#3456C8;
  --accent-fanart:#C43A83;--accent-youtube:#C93434;--accent-tarot:#743AC1;--accent-minigames:#A66A00;
  --accent-history:#596879;--accent-data:#087F6B;--accent-calendar:#658800;
}
.category-accent{--category-accent:var(--orange-2)}
.category-accent[data-kind="schedule"]{--category-accent:var(--accent-schedule)}
.category-accent[data-kind="notice"]{--category-accent:var(--accent-notice)}
.category-accent[data-kind="replay"]{--category-accent:var(--accent-replay)}
.category-accent[data-kind="clips"]{--category-accent:var(--accent-clips)}
.category-accent[data-kind="fanart"]{--category-accent:var(--accent-fanart)}
.category-accent[data-kind="youtube"]{--category-accent:var(--accent-youtube)}
.category-accent[data-kind="tarot"]{--category-accent:var(--accent-tarot)}
.category-accent[data-kind="minigames"]{--category-accent:var(--accent-minigames)}
.category-accent[data-kind="history"]{--category-accent:var(--accent-history)}
.category-accent[data-kind="data"]{--category-accent:var(--accent-data)}
.category-accent[data-kind="calendar"]{--category-accent:var(--accent-calendar)}
```

- [ ] **Step 4: `site-shell.js`에서 shared CSS를 한 번만 주입한다**

```js
if (!document.querySelector('link[data-site-design-system]')) {
  const design=document.createElement('link');
  design.rel='stylesheet';
  design.href='site-design-system.css';
  design.dataset.siteDesignSystem='true';
  document.head.appendChild(design);
}
```

- [ ] **Step 5: 테스트 통과**

Run:
```bash
node tests/site-design-system-regression.mjs
node tests/site-quality-regression.mjs
node --check site-shell.js
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add site-design-system.css site-shell.js tests/site-design-system-regression.mjs tests/site-quality-regression.mjs
git commit -m "feat: add shared visual design tokens"
```

---

### Task 2: 헤더 current / section / hover 상태 분리

**Files:**
- Modify: `site-shell.js`
- Modify: `site-quality.css`
- Modify: `tests/site-quality-regression.mjs`
- Modify: `tests/recent-update-browser-audit.mjs`

**Interfaces:**
- Consumes: `body.dataset.page`, `NAV_GROUPS`
- Produces: `aria-current="page"`, `.is-current-section`

- [ ] **Step 1: failing assertions 추가**

```js
assert.match(shell,/aria-current/);
assert.match(shell,/is-current-section/);
assert.match(quality,/is-current-section/);
assert.match(quality,/\[aria-current="page"\]/);
```

Playwright에서는 HOME/vod/tarot/data의 current element와 section trigger를 확인한다.

- [ ] **Step 2: 실패 확인**

Run:
```bash
node tests/site-quality-regression.mjs
MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs
```

Expected: new current-section assertions FAIL.

- [ ] **Step 3: nav DOM에 상태를 명시한다**

```js
const current=document.body.dataset.page||'';
nav.querySelectorAll('[data-nav]').forEach(link=>{
  const active=link.dataset.nav===current;
  link.classList.toggle('active',active);
  if(active) link.setAttribute('aria-current','page');
  else link.removeAttribute('aria-current');
});
```

NAV group wrapper는 current item을 포함할 때 `active is-current-section`을 함께 가진다.

- [ ] **Step 4: 네 상태 CSS 구현**

다크:
- default text `var(--text-secondary)`
- hover/open: neutral glass + `var(--text-primary)`
- current section: soft orange outline/text, weight 900
- current page: `#ff7a1a` filled background + `#1a0d05`

라이트:
- default `#4a4038`
- hover/open `#1f1814` + neutral gray
- current section `#c94f00` + pale orange
- current page `#e85d04` + white text

- [ ] **Step 5: dark/light browser audit 통과**

Run: `MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs`  
Expected: PASS; open dropdown and current page computed backgrounds differ.

- [ ] **Step 6: 커밋**

```bash
git add site-shell.js site-quality.css tests/site-quality-regression.mjs tests/recent-update-browser-audit.mjs
git commit -m "feat: clarify header navigation states"
```

---

### Task 3: 홈 palette/icon/text를 shared tokens로 전환

**Files:**
- Modify: `home-refresh.css`
- Modify: `index.html`
- Modify: `tests/home-nav-order-regression.mjs`
- Modify: `tests/recent-update-browser-audit.mjs`

**Interfaces:**
- Consumes: Task 1 tokens
- Produces: 홈의 11 category가 전역 색/아이콘과 일치

- [ ] **Step 1: failing token usage 테스트 추가**

대표 카드와 compact menu가 각 `var(--accent-...)`를 사용하는지 검사하고, 기존 유사색 hardcode를 허용하지 않는다.

- [ ] **Step 2: 실패 확인**

Run: `node tests/home-nav-order-regression.mjs`  
Expected: FAIL because current `home-refresh.css` uses literal hex colors.

- [ ] **Step 3: accent hardcode를 token으로 변경**

```css
.portal-card[data-kind="replay"]{--portal-accent:var(--accent-replay)}
.portal-card[data-kind="tarot"]{--portal-accent:var(--accent-tarot)}
.portal-card[data-kind="minigames"]{--portal-accent:var(--accent-minigames)}
.portal-card[data-kind="data"]{--portal-accent:var(--accent-data)}
.portal-compact-grid>a[data-kind="schedule"]{--compact-accent:var(--accent-schedule)}
.portal-compact-grid>a[data-kind="notice"]{--compact-accent:var(--accent-notice)}
.portal-compact-grid>a[data-kind="clips"]{--compact-accent:var(--accent-clips)}
.portal-compact-grid>a[data-kind="fanart"]{--compact-accent:var(--accent-fanart)}
.portal-compact-grid>a[data-kind="youtube"]{--compact-accent:var(--accent-youtube)}
.portal-compact-grid>a[data-kind="history"]{--compact-accent:var(--accent-history)}
.portal-compact-grid>a[data-kind="calendar"]{--compact-accent:var(--accent-calendar)}
```

- [ ] **Step 4: icon과 text hierarchy 확정**

아이콘:
`schedule ◷ / notice ! / replay ▶ / clips ⚡ / fanart ✦ / youtube ▷ / tarot ✧ / minigames ◆ / history ↺ / data ▥ / calendar ▦`.

카드 제목은 `--text-primary`, 설명은 `--text-secondary`, 영문 category label은 11px 이상 + weight 800 이상.

- [ ] **Step 5: 회귀 통과**

Run:
```bash
node tests/home-nav-order-regression.mjs
MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add home-refresh.css index.html tests/home-nav-order-regression.mjs tests/recent-update-browser-audit.mjs
git commit -m "feat: align home cards with category palette"
```

---

### Task 4: 개별 페이지의 숫자 장식을 semantic identity로 교체

**Files:**
- Modify: `site-design-system.css`
- Modify: `schedule.html`, `notice.html`, `vod.html`, `clips.html`, `fanart.html`, `youtube.html`, `tarot.html`, `minigames.html`, `history.html`, `data.html`
- Modify: page hero CSS only where existing hardcode defeats `--page-accent`
- Create: `tests/site-page-accent-regression.mjs`

**Interfaces:**
- Consumes: `body[data-page]`
- Produces: `--page-accent`, semantic kicker icon + tag

- [ ] **Step 1: 번호 제거 failing test 작성**

각 HTML에서 `class="kicker">NN /` 패턴이 없어야 하고 해당 semantic tag/icon이 존재해야 한다.

- [ ] **Step 2: 실패 확인**

Run: `node tests/site-page-accent-regression.mjs`  
Expected: FAIL, e.g. `data.html` currently contains `10 / DATA`.

- [ ] **Step 3: page accent mapping 추가**

```css
body[data-page="schedule"]{--page-accent:var(--accent-schedule)}
body[data-page="notice"]{--page-accent:var(--accent-notice)}
body[data-page="vod"]{--page-accent:var(--accent-replay)}
body[data-page="clips"]{--page-accent:var(--accent-clips)}
body[data-page="fanart"]{--page-accent:var(--accent-fanart)}
body[data-page="youtube"]{--page-accent:var(--accent-youtube)}
body[data-page="tarot"]{--page-accent:var(--accent-tarot)}
body[data-page="minigames"],body[data-page="chuntris"],body[data-page="chunbak"],body[data-page="chungwagame"],body[data-page="chuncortile"]{--page-accent:var(--accent-minigames)}
body[data-page="history"]{--page-accent:var(--accent-history)}
body[data-page="data"]{--page-accent:var(--accent-data)}
.page-category-kicker,.page-hero .kicker{color:var(--page-accent,var(--orange-2))}
```

- [ ] **Step 4: 각 HTML kicker 교체**

Example:
```html
<p class="kicker page-category-kicker"><span aria-hidden="true">▥</span> DATA</p>
```

10개 페이지를 확정 icon/tag로 교체하고 CTA는 브랜드 주황 그대로 둔다.

- [ ] **Step 5: page-specific hero accent만 `var(--page-accent)`로 변경**

본문/큰 제목은 neutral text를 유지한다.

- [ ] **Step 6: 회귀 통과**

Run:
```bash
node tests/site-page-accent-regression.mjs
node tests/site-quality-regression.mjs
```

Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add site-design-system.css *.html *hero*.css tests/site-page-accent-regression.mjs tests/site-quality-regression.mjs
git commit -m "feat: unify page category accents"
```

---

### Task 5: 최근 업데이트·검색·MY 팬허브 category identity 통일

**Files:**
- Modify: `activity-center.js`, `activity-center.css`
- Modify: `site-improvements.js`, `site-improvements.css`
- Modify: `personal-hub.js`, `personal-hub.css`
- Modify: `tests/activity-center-regression.mjs`
- Modify: `tests/site-search-home-regression.mjs`
- Modify: `tests/personal-hub-regression.mjs`

**Interfaces:**
- Consumes: item type/kind
- Produces: normalized `data-kind` and category icon

- [ ] **Step 1: activity mapping failing test 추가**

기대 mapping:

```js
const CATEGORY_META={
  schedule:{kind:'schedule',icon:'◷'},
  notice:{kind:'notice',icon:'!'},
  vod:{kind:'replay',icon:'▶'},
  catch:{kind:'clips',icon:'⚡'},
  clip:{kind:'clips',icon:'⚡'},
  videos:{kind:'youtube',icon:'▷'},
  shorts:{kind:'youtube',icon:'▷'},
  fanart:{kind:'fanart',icon:'✦'}
};
```

- [ ] **Step 2: 실패 확인**

Run:
```bash
node tests/activity-center-regression.mjs
node tests/site-search-home-regression.mjs
node tests/personal-hub-regression.mjs
```

Expected: new mapping/data-kind assertions FAIL.

- [ ] **Step 3: activity row markup 변경**

thumb가 없으면 category icon, thumb가 있으면 image를 유지한다. copy/meta wrapper에는 normalized `data-kind`를 붙인다. 제목/설명은 neutral text, icon/meta label만 category accent를 쓴다. unread dot은 경고 빨강 대신 브랜드 주황 계열로 조정한다.

- [ ] **Step 4: 검색 결과와 MY 팬허브에 normalized `data-kind` 추가**

검색 ROUTES/content result와 개인 보관함 항목에 기능 key를 별도로 저장한다. kind badge/icon만 category accent, 저장/핀/완료 같은 개인 상태는 브랜드 주황을 유지한다.

- [ ] **Step 5: 관련 테스트 통과**

Run:
```bash
node tests/activity-center-regression.mjs
node tests/site-search-home-regression.mjs
node tests/personal-hub-regression.mjs
node --check activity-center.js
node --check site-improvements.js
node --check personal-hub.js
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add activity-center.js activity-center.css site-improvements.js site-improvements.css personal-hub.js personal-hub.css tests/activity-center-regression.mjs tests/site-search-home-regression.mjs tests/personal-hub-regression.mjs
git commit -m "feat: share category identity across utility surfaces"
```

---

### Task 6: 춘봉 데이터 graph tooltip 중복 제거와 DATA accent 적용

**Files:**
- Modify: `data-soop-periods-v3.js`
- Modify: `data-enhancements.css`
- Modify: `data-soop-periods-v2.css`
- Modify: `tests/data-dashboard-soop-periods-regression.mjs`
- Modify: `tests/recent-update-browser-audit.mjs`

**Interfaces:**
- Consumes: existing `.data-chart-hover`, formatter, aria-label
- Produces: custom tooltip only; keyboard focus 유지; edge-clamped card position

- [ ] **Step 1: failing regression 추가**

```js
assert.ok(!periods.includes('<title>'),'chart point native SVG title must be removed');
assert.match(periods,/tabindex="0" aria-label=/);
assert.match(periods,/data-chart-hover-card/);
assert.match(periods,/cardY|tooltipY/);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/data-dashboard-soop-periods-regression.mjs`  
Expected: FAIL because current point markup emits `<title>`.

- [ ] **Step 3: native title 제거 + Y clamp 구현**

두 chart renderer에서:

```js
const tooltipHeight=60;
const preferredAbove=yy-tooltipHeight-12;
const cardY=preferredAbove>=8
  ? preferredAbove
  : Math.min(height-bottom-tooltipHeight,yy+14);
```

기존 `Math.max(8,yy-66)`를 `cardY`로 바꾸고 SVG `<title>` node를 제거한다. 기존 X clamp는 유지한다.

- [ ] **Step 4: DATA accent / 중복 value 숨김**

```css
.data-chart-crosshair{stroke:color-mix(in srgb,var(--accent-data) 48%,transparent)}
.data-chart-hover-card rect{fill:#0b1010;stroke:color-mix(in srgb,var(--accent-data) 58%,transparent)}
.data-chart-hover-card text{fill:var(--text-muted)}
.data-chart-hover-card text.value{fill:var(--text-primary)}
.data-chart-hover:hover>.data-chart-value,.data-chart-hover:focus>.data-chart-value{opacity:.08}
.data-chart-hover:hover circle,.data-chart-hover:focus circle{stroke:var(--accent-data)}
[data-theme="light"] .data-chart-hover-card rect{fill:#fff;stroke:color-mix(in srgb,var(--accent-data) 55%,#d7d7d7)}
```

- [ ] **Step 5: Playwright에서 custom tooltip 하나와 양 끝 point focus 검증**

`#data-soop-chart title` count 0, 첫/마지막 `.data-chart-hover` focus 시 tooltip opacity 1, 고정 `.data-chart-value` opacity < 0.2, tooltip transform이 viewBox 내부인지 확인한다.

- [ ] **Step 6: 테스트 통과**

Run:
```bash
node tests/data-dashboard-soop-periods-regression.mjs
MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs
node --check data-soop-periods-v3.js
```

Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add data-soop-periods-v3.js data-enhancements.css data-soop-periods-v2.css tests/data-dashboard-soop-periods-regression.mjs tests/recent-update-browser-audit.mjs
git commit -m "fix: simplify data chart tooltips"
```

---

### Task 7: 사이트 전체 text hierarchy와 hardcode 충돌 정리

**Files:**
- Modify: `site-design-system.css`
- Modify: `theme.css`, `site-quality.css`, `personal-hub.css`, `activity-center.css`
- Modify: page CSS only where user-readable hardcoded muted colors override shared hierarchy
- Create: `tests/site-text-contrast-regression.mjs`

**Interfaces:**
- Consumes: text tokens
- Produces: shared primary/secondary/muted/meta hierarchy

- [ ] **Step 1: failing shared hierarchy test 작성**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../site-design-system.css',import.meta.url),'utf8');
for(const selector of ['.page-hero','.section-head','.portal-card','.home-overview-card','.activity-item-copy','.personal-panel']){
  assert.ok(css.includes(selector),selector+' missing');
}
assert.match(css,/color:var\(--text-primary\)/);
assert.match(css,/color:var\(--text-secondary\)/);
assert.match(css,/color:var\(--text-muted\)/);
console.log('site text contrast regression passed');
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/site-text-contrast-regression.mjs`  
Expected: FAIL until shared rules are present.

- [ ] **Step 3: semantic shared text rules 추가**

제목/핵심은 primary, 실제 설명은 secondary, 날짜/부가정보는 muted/meta를 쓴다. 광범위한 `small{}` override는 금지하고 의미가 확인된 selector만 지정한다.

- [ ] **Step 4: 충돌 hardcode 최소 치환**

사용자가 읽는 설명문에 남아 shared rule을 덮는 `#777/#787878/#817...` 계열만 token으로 변경한다. disabled/decorative 요소는 그대로 둘 수 있다.

- [ ] **Step 5: dark/light browser computed color 검증**

HOME 대표 카드와 header 기본 메뉴/설명문을 light/dark 각각 검사해 mode별 token이 적용되는지 확인한다.

- [ ] **Step 6: 테스트 통과**

Run:
```bash
node tests/site-text-contrast-regression.mjs
node tests/site-quality-regression.mjs
MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs
```

Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add site-design-system.css theme.css site-quality.css personal-hub.css activity-center.css *.css tests/site-text-contrast-regression.mjs tests/site-quality-regression.mjs tests/recent-update-browser-audit.mjs
git commit -m "fix: raise sitewide text contrast"
```

---

### Task 8: PWA, 통합 회귀, changelog, Production 배포

**Files:**
- Modify: `service-worker.js`
- Modify: `tests/pwa-regression.mjs`
- Modify: `changelog-data.js`
- Modify: smoke workflow only if exact new shared asset validation is required

**Interfaces:**
- Consumes: Tasks 1-7
- Produces: Production-ready main with `/api/version synced:true`

- [ ] **Step 1: PWA asset failing test 추가**

```js
const sw=read('service-worker.js');
assert.match(sw,/site-design-system\.css/,'PWA shell must cache the shared design system');
```

- [ ] **Step 2: 실패 확인 후 app-shell cache에 shared CSS 추가하고 cache version을 한 단계 올린다**

Run before: `node tests/pwa-regression.mjs` → Expected FAIL.  
Run after: `node tests/pwa-regression.mjs` → Expected PASS.

- [ ] **Step 3: 업데이트 일지에 사용자용 항목 하나만 반영**

2026-09-21에 동일 항목이 없을 때만:

```js
{
  date:'2026-09-21',
  title:'팬사이트 전체 색상·아이콘·글자 가독성 통일',
  description:'홈에서 시작한 기능별 색상과 아이콘 체계를 전체 메뉴·각 페이지·최근 업데이트·검색·팬허브까지 확장하고, 다크/라이트 글자 대비와 춘봉 데이터 그래프 툴팁을 개선했습니다.'
}
```

동일 의미 카드가 있으면 새 카드를 만들지 않고 기존 description만 보강한다.

- [ ] **Step 4: 핵심 정적 회귀 전부 실행**

```bash
node tests/site-design-system-regression.mjs
node tests/site-page-accent-regression.mjs
node tests/site-text-contrast-regression.mjs
node tests/site-quality-regression.mjs
node tests/activity-center-regression.mjs
node tests/site-search-home-regression.mjs
node tests/personal-hub-regression.mjs
node tests/data-dashboard-soop-periods-regression.mjs
node tests/pwa-regression.mjs
node tests/mobile-site-regression.mjs
node tests/mobile-header-single-row-regression.mjs
node tests/home-nav-order-regression.mjs
```

Expected: all PASS.

- [ ] **Step 5: JS syntax validation**

```bash
node --check site-shell.js
node --check activity-center.js
node --check site-improvements.js
node --check personal-hub.js
node --check data-soop-periods-v3.js
```

Expected: exit 0.

- [ ] **Step 6: dark/light desktop + mobile browser audit**

Run: `MOCK_CONTENT=1 node tests/recent-update-browser-audit.mjs`  
Expected: PASS. Local Playwright unavailable이면 PR workflow에서 같은 audit가 PASS해야 병합한다.

- [ ] **Step 7: whole-branch review**

확인 항목:
- 기능/URL/API 변경 없음
- 11 category accents가 서로 구별됨
- 브랜드 주황과 category accent 역할이 섞이지 않음
- SVG native tooltip 없음
- current/open/hover 상태가 시각적으로 구분됨
- mobile/PWA layout 회귀 없음

- [ ] **Step 8: 마지막 커밋**

```bash
git add service-worker.js tests/pwa-regression.mjs changelog-data.js
git commit -m "chore: ship sitewide visual system"
```

- [ ] **Step 9: PR Ready → CI/Vercel Preview green → squash merge**

Squash title: `팬사이트 전체 색상·아이콘·가독성 통일`

- [ ] **Step 10: Production 검증**

`/api/version`: `sha===mainSha`, `synced:true`, `ref:"main"`, `environment:"production"`.

HTTP 200:
`/`, `/schedule.html`, `/vod.html`, `/tarot.html`, `/minigames.html`, `/history.html`, `/data.html`, `/myhub.html`, `/site-design-system.css`.

Vercel runtime errors last 30m: no new errors.

- [ ] **Step 11: LIVE 상태 비파괴 확인**

`/api/content?type=live`가 `live:true`면 스마트 카드가 LIVE로, `false/null`이면 기존 VOD/station fallback으로 유지되는지만 확인한다. 실제 방송 시작 상태를 인위적으로 변경하지 않는다.
