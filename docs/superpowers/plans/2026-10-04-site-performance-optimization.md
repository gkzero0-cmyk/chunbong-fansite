# 춘봉 팬사이트 전반 성능 최적화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈·메뉴·업데이트 일지·미니게임·춘봉 콘텐츠의 체감 로딩을 개선하고, 첫 화면과 내부 이동이 API/부가 런타임에 막히지 않도록 하면서 Redis/Vercel/외부 API 사용량은 늘리지 않는다.

**Architecture:** 현재 정적 다중 페이지 구조와 기존 `site-shell.js` 진입점을 유지한다. `site-shell.js`는 캐시·메뉴·테마·즉시 반응에 필요한 최소 critical runtime만 담당하고, 검색/health/meta/개인화/관찰 기능은 새 `site-shell-idle.js`와 기존 지연 런타임으로 옮긴다. 페이지 데이터는 stale-while-revalidate 방식으로 last-good를 우선 렌더하고 네트워크 결과는 백그라운드 갱신한다. 큰 목록은 첫 배치만 즉시 그리고 나머지는 idle chunk로 붙인다. SPA나 새 프레임워크는 도입하지 않는다.

**Tech Stack:** 정적 HTML/CSS/Vanilla JS, Vercel, Service Worker/PWA, Node.js regression tests, Playwright browser smoke tests.

**Spec:** `docs/superpowers/specs/2026-10-04-site-performance-optimization-design.md`

## Global Constraints

- `perf/site-speed-20261004` 브랜치에서만 구현한다. Vercel `perf/*` 배포는 비활성화되어 있으므로 제한 해제 전 Production/Preview 배포를 만들지 않는다.
- 현재 main의 collector bootstrap/runtime 구조와 SOOP 15분 watcher를 변경하지 않는다.
- 새로운 Redis polling, cron, serverless function, 외부 API 주기 호출을 추가하지 않는다.
- 첫 화면 속도를 위해 기능을 삭제하지 않는다. non-critical 기능은 idle/interaction/viewport 시점으로 이동한다.
- 기존 `ChunbongCache`, budget fetch, last-good 저장 구조를 재사용한다.
- Save-Data 또는 `effectiveType`이 `slow-2g`/`2g`인 연결에서는 내부 페이지 prefetch를 하지 않는다.
- 테스트를 약화시키지 않는다. 구조가 바뀌는 테스트는 동일한 사용자 계약을 새 파일/새 시점에 맞게 옮긴다.
- 각 Task는 RED → GREEN → 관련 회귀 재실행 → 커밋 순서로 끝낸다.
- main 병합과 Production 배포는 전체 테스트가 green이고 Vercel 제한 해제 상태를 확인한 뒤 별도 단계에서 진행한다.

## Review Focus

- 메뉴/테마/PWA/검색/업데이트 알림처럼 공통 기능이 경량화 과정에서 사라지지 않는가.
- 첫 방문과 캐시가 있는 재방문 모두 정상인가.
- 캐시 데이터가 오래됐을 때 최신 네트워크 결과로 교체되며, 실패 시 last-good가 유지되는가.
- idle 작업이 사용자 클릭보다 먼저 CPU를 점유하지 않는가.
- progressive render 중 검색/필터/뒤로가기/딥링크가 잘못된 이전 generation의 DOM을 붙이지 않는가.
- PWA offline app shell을 지나치게 줄여 오프라인 홈이 깨지지 않는가.
- Redis/Vercel/API 호출 수가 기존보다 늘지 않는가.

---

## Task 1: 성능 계약을 먼저 테스트로 고정

**Files:**
- Create: `tests/site-performance-critical-path-regression.mjs`
- Modify: `tests/site-shell-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

- [ ] **1.1 RED — critical-path 회귀 테스트 추가**
  - `site-shell.js` 시작 시 `pruneSnapshots()`를 직접 호출하지 않는 계약을 추가한다.
  - `writeSnapshot()`이 매 저장마다 전체 localStorage prune을 동기 실행하지 않는 계약을 추가한다.
  - `site-health.js`, `site-improvements.js`, `site-meta.js`가 critical path에서 직접 즉시 로드되지 않고 idle loader를 통하도록 요구한다.
  - `minigames.html`과 `changelog.html`이 `content.js`를 로드하지 않는 계약을 추가한다.
  - `site-shell.js` 또는 idle helper에 same-origin navigation intent prefetch가 존재하고 Save-Data/2G를 차단하는 계약을 추가한다.
  - `site-shell.js`의 크기 상한을 현재 20KB보다 낮춘 목표치로 고정한다. 목표: core 진입점 `< 14KB`.

- [ ] **1.2 RED 확인**
  - Run: `node tests/site-performance-critical-path-regression.mjs`
  - Run: `node tests/site-shell-regression.mjs`
  - Expected: 새 계약 때문에 실패.

- [ ] **1.3 기존 shell 회귀 테스트를 새 역할에 맞게 갱신**
  - 모든 일반 페이지가 `content.js`를 반드시 로드한다는 기존 가정을 제거한다.
  - 페이지별로 실제 필요한 번들만 요구하도록 바꾼다.
  - 메뉴/테마/캐시/changelog 버튼/미니게임 submenu 기능 계약은 유지한다.

- [ ] **1.4 CI syntax 목록 준비**
  - 뒤 Task에서 추가될 `site-shell-idle.js`, `minigame-profile-loader.js`를 `node --check` 목록에 넣도록 workflow 변경을 예약한다.

- [ ] **1.5 Commit**
  - `test: define site performance critical path contracts`

---

## Task 2: `site-shell` critical path 경량화

**Files:**
- Modify: `site-shell.js`
- Create: `site-shell-idle.js`
- Modify: `site-improvements.js`
- Modify: `service-worker.js`
- Modify: `.github/workflows/site-regression.yml`
- Modify: `tests/site-shell-regression.mjs`
- Modify: `tests/site-performance-critical-path-regression.mjs`

**Target interfaces:**
- `window.ChunbongCache`: 기존 API 유지 (`get`, `peek`, `set`, `clear`, `fetchJson`).
- `window.ChunbongNavigation`: 기존 메뉴 데이터 유지.
- `window.ChunbongIdle.schedule(fn, {timeout})`: idle 작업 공통 스케줄러를 새로 노출한다.
- `window.ChunbongNavigationPrefetch.shouldPrefetch(connection)` / `.prefetch(url)`: 네트워크 조건을 검사하고 same-origin HTML만 한정 prefetch한다.

- [ ] **2.1 RED — idle loader와 prefetch 계약 추가**
  - `site-shell-idle.js` 존재, 문법 유효.
  - `site-shell.js`가 idle helper를 `requestIdleCallback` 또는 fallback timer로 지연 로드.
  - `shouldPrefetch`가 `saveData === true`, `slow-2g`, `2g`에서 false.
  - prefetch는 http(s) same-origin HTML 링크만 허용하고 최대 4개를 dedupe.
  - hover/focus는 약 120ms intent 후, touch는 실제 `touchstart` 시 한 번만 warm.

- [ ] **2.2 GREEN — localStorage prune을 idle로 이동**
  - 초기 `pruneSnapshots();` 제거.
  - `writeSnapshot()`은 저장 후 `scheduleSnapshotPrune()`만 호출.
  - prune scheduler는 한 세션에서 중복 예약되지 않게 flag 사용.
  - 저장 용량/개수/7일 TTL 기존 정책은 그대로 유지.

- [ ] **2.3 GREEN — non-critical runtime 분리**
  - `site-shell-idle.js`로 다음 로딩 책임을 이동:
    - `site-health.js`
    - `site-improvements.js?v=2`
    - `site-meta.js`
    - passive 페이지의 `personal-hub.js/css`
    - activity center와 서버 기반 changelog unread refresh의 네트워크 시작 부분
  - 홈/myhub/tarot에서 개인화 UI가 실제 첫 화면에 필요한 경우에는 local-only skeleton/기본 UI만 core에 두고 heavy runtime은 짧은 idle timeout으로 로드.

- [ ] **2.4 GREEN — 통합검색 데이터는 실제 검색 시점에만 로드**
  - `site-improvements.js`의 `loadSearchRows()`가 페이지 시작 시 호출되지 않도록 보장.
  - 검색 dialog가 열리거나 입력이 2자 이상일 때 최초 1회 시작.
  - 같은 세션에서 Promise를 재사용해 중복 API 묶음 호출 금지.
  - 메뉴 검색은 네트워크 없이 즉시 사용 가능.

- [ ] **2.5 GREEN — 내부 이동 intent prefetch**
  - 메뉴/내부 링크에 delegated `pointerenter`, `focusin`, `touchstart` 사용.
  - query/hash가 있어도 same-origin navigation URL만 prefetch.
  - 외부 링크, 다운로드, `target=_blank`, API, operator는 제외.
  - 클릭 시 `<html>` 또는 `<body>`에 `is-navigating` class를 즉시 붙여 시각 반응 제공하고 `pageshow`에서 해제.

- [ ] **2.6 PWA shell 조정은 최소 범위로 준비**
  - 이 Task에서는 `site-shell.js` critical core는 APP_SHELL에 유지.
  - 새 `site-shell-idle.js`는 initial precache에 넣지 않고 첫 온라인 사용 후 runtime cache 대상이 되도록 둔다.
  - 아직 `site-meta/site-health/site-improvements/content.js` 제거는 Task 7에서 최종 검증 후 처리.

- [ ] **2.7 Tests**
  - Run: `node tests/site-performance-critical-path-regression.mjs`
  - Run: `node tests/site-shell-regression.mjs`
  - Run: `node tests/changelog-regression.mjs`
  - Run: `node tests/analytics-redis-budget-regression.mjs`
  - Run: `npm test`

- [ ] **2.8 Commit**
  - `perf: slim shared site critical path`

---

## Task 3: 홈을 cached-first로 만들고 중복 초기 네트워크를 줄이기

**Files:**
- Modify: `home-overview.js`
- Modify: `home-smart-status.js`
- Modify: `index.html`
- Create: `tests/home-critical-path-performance-regression.mjs`

**Target behavior:**
- cached overview가 있으면 DOMContentLoaded 직후 바로 표시.
- 최신 요청은 백그라운드에서 수행.
- 첫 화면 아래 stats/archive는 현재 IntersectionObserver 지연을 유지.
- fortune loader의 현재 interaction lazy 정책은 그대로 유지.

- [ ] **3.1 RED — home cached-first 테스트 추가**
  - `home-overview.js`가 `ChunbongCache.peek()`으로 `home-overview:schedule`, `home-overview:activity`, `home-overview:live` 또는 이에 준하는 stable key를 네트워크 전에 읽는 계약.
  - network refresh는 캐시 렌더 후 시작.
  - archive/data는 IntersectionObserver 지연 유지.
  - `home-fortune-loader.js`가 초기 daily-fortune runtime을 직접 로드하지 않는 기존 계약도 보호.

- [ ] **3.2 GREEN — cached snapshot 즉시 렌더**
  - cached schedule/activity/live가 존재하면 각 카드의 loading 상태를 즉시 해제.
  - cache timestamp가 TTL을 초과했더라도 `peek` 값은 화면에 임시 사용 가능하되 background refresh가 반드시 실행되도록 한다.
  - network 결과가 cached 결과와 실질적으로 같으면 불필요한 `innerHTML` 재작성 생략.

- [ ] **3.3 GREEN — live 상태 API 중복 완화**
  - `home-overview.js`가 최신 live payload를 `CustomEvent('chunbong:home-live', {detail})`로 알린다.
  - `home-smart-status.js`는 짧은 bootstrap window 동안 해당 이벤트/공유 cache를 우선 사용하고 즉시 별도 live 요청을 만들지 않는다.
  - overview가 없거나 실패한 경우에만 smart-status가 자체 refresh.
  - 기존 60초 timer와 visibility/focus 갱신은 유지하되 hidden tab에서는 요청 금지.

- [ ] **3.4 HTML script 우선순위 확인**
  - hero/header에 필요한 script 외 홈 위젯 script는 `defer` 성격을 보장.
  - hero image 하나만 `fetchpriority=high` 유지.

- [ ] **3.5 Tests**
  - Run: `node tests/home-critical-path-performance-regression.mjs`
  - Run: `node tests/site-performance-critical-path-regression.mjs`
  - Run: `node tests/predeploy-browser-quality.mjs` under local Playwright when available.

- [ ] **3.6 Commit**
  - `perf: render home from cache before refresh`

---

## Task 4: 미니게임 허브에서 불필요 번들 제거

**Files:**
- Modify: `minigames.html`
- Create: `minigame-profile-loader.js`
- Modify: `minigame-profile.js` only if loader-ready event is needed
- Modify: `tests/minigame-profile-regression.mjs`
- Modify: `tests/site-shell-regression.mjs`
- Modify: `tests/site-performance-critical-path-regression.mjs`
- Modify: `.github/workflows/site-regression.yml`

- [ ] **4.1 RED — minigames slim-load 계약**
  - `minigames.html`에 `content.js`가 없어야 한다.
  - 카드 문구는 HTML 자체가 source of truth이므로 별도 content sync가 없어도 현재 문구가 보존돼야 한다.
  - 직접 `minigame-profile.js`를 파싱하지 않고 작은 loader만 로드한다.
  - loader는 idle 시 profile runtime을 로드하며, profile 영역이 viewport 근처에 오면 즉시 당겨온다.

- [ ] **4.2 GREEN — `content.js` 제거**
  - `minigames.html`의 `content.js` script 제거.
  - 이미지 lazy/decoding 공통 처리가 필요한 경우 `site-shell.js`의 작은 공통 이미지 보조로 이동하되 hero는 제외.

- [ ] **4.3 GREEN — profile loader 추가**
  - `minigame-profile-loader.js` 목표 크기 `< 1.5KB`.
  - `requestIdleCallback(..., {timeout:1500})` fallback `setTimeout(...,700)`.
  - profile root가 600px rootMargin 안에 들어오면 즉시 load.
  - script 중복 방지 data attribute 사용.
  - 기존 `minigame-profile.js` 기능/저장 key는 변경하지 않는다.

- [ ] **4.4 Hero 이미지 네트워크 비용 확인**
  - 기존 더 작은 동일 이미지 asset이 repo에 있으면 `<picture>`/`srcset`으로 모바일 후보를 추가한다.
  - 적절한 파생 asset이 없다면 이 Task에서 새 고용량 변환 파이프라인은 추가하지 않고 현재 WebP를 유지한다. 기능적 최적화를 이미지 생성 때문에 지연시키지 않는다.

- [ ] **4.5 Tests**
  - Run: `node tests/minigame-profile-regression.mjs`
  - Run: `node tests/site-performance-critical-path-regression.mjs`
  - Run: `node tests/site-shell-regression.mjs`
  - Run: `npm test`

- [ ] **4.6 Commit**
  - `perf: slim minigames hub startup`

---

## Task 5: 업데이트 일지를 progressive render + cache-first로 전환

**Files:**
- Modify: `changelog.js`
- Modify: `changelog.html`
- Modify: `tests/changelog-regression.mjs`
- Modify: `.github/workflows/changelog-browser-smoke.yml` only if waits/selectors need timing-safe adjustments
- Create: `tests/changelog-progressive-render-regression.mjs`

**Target constants:**
- `INITIAL_CHANGELOG_GROUPS = 8`
- `CHANGELOG_CHUNK_SIZE = 8`
- `CHANGELOG_SYNC_INTERVAL_MS = 10 * 60 * 1000` 유지.

- [ ] **5.1 RED — progressive timeline 계약**
  - 최초 render에서 8개 날짜 그룹까지만 동기 생성.
  - 나머지는 idle chunk로 이어 붙이는 함수가 존재.
  - 전체 date index도 첫 batch 이후 idle에 완성.
  - 최신 seen key/read-state는 전체 DOM 완료를 기다리지 않고 데이터 기준으로 즉시 계산.

- [ ] **5.2 GREEN — initial batch + idle continuation**
  - `renderGroups(groups)`를 generation token 기반으로 바꾼다.
  - 새 refresh가 시작되면 이전 idle chunk가 stale DOM을 append하지 못하도록 generation 비교.
  - 첫 8 groups는 즉시, 나머지는 8개씩 idle append.
  - timeline의 기존 anchor/date attribute를 유지한다.

- [ ] **5.3 GREEN — startup 자동 history refresh를 cache-first로**
  - `ChunbongCache.peek('changelog-history')`가 있으면 먼저 merge/render.
  - initial request는 10분 TTL의 `fetchJson(..., staleIfError:true)` 사용.
  - `refresh=1` 강제 bypass는 사용자가 focus로 돌아왔고 10분 budget을 넘긴 명시적 refresh에만 허용하거나 제거한다.
  - API 요청 횟수는 기존보다 많아지지 않아야 한다.

- [ ] **5.4 Browser smoke 보존**
  - 기존 Playwright가 모든 과거 날짜를 기다리면 idle chunk 완료를 `waitForFunction`으로 기다리도록 timing-safe하게만 조정.
  - 카드 내용/필터링/한글 요약/read-state assertions는 그대로 유지.

- [ ] **5.5 Tests**
  - Run: `node tests/changelog-progressive-render-regression.mjs`
  - Run: `node tests/changelog-regression.mjs`
  - Run local browser smoke when Playwright available, otherwise PR CI에서 `.github/workflows/changelog-browser-smoke.yml` 확인.

- [ ] **5.6 Commit**
  - `perf: progressively render changelog history`

---

## Task 6: 춘봉 콘텐츠 목록과 상세 enhancement를 단계적으로 로드

**Files:**
- Modify: `chunbong-contents.js`
- Modify: `mobile-runtime-loader.js`
- Modify: `chunbong-contents.html` only if a loader marker is needed
- Modify: `tests/chunbong-contents-browser-smoke.mjs`
- Modify: `tests/chunbong-posts-browser-smoke.mjs`
- Modify: `tests/site-structure-performance-v21-regression.mjs`
- Create: `tests/chunbong-contents-progressive-render-regression.mjs`

**Target constants/interfaces:**
- `INITIAL_ARCHIVE_RENDER = 12`
- `ARCHIVE_RENDER_CHUNK = 12`
- detail mount 후 `document.dispatchEvent(new CustomEvent('chunbong:contents-detail-ready',{detail:{id}}))`

- [ ] **6.1 RED — archive progressive contract**
  - 필터/정렬 결과 전체를 한 번에 `innerHTML` 하지 않고 initial 12 + chunk 12 계약.
  - filter/search 변경마다 render generation이 증가하여 이전 chunk append 취소.
  - direct detail URL에서는 상세 화면을 우선하고 전체 카드 grid render를 critical path에서 미룸.
  - heavy contents extras는 detail-ready 이벤트 전에는 로드하지 않음.

- [ ] **6.2 GREEN — 카드 목록 chunk renderer**
  - `renderList()`를 initial synchronous batch와 idle continuation으로 분리.
  - 검색/필터/정렬 변경 시 기존 scheduled chunk를 generation token으로 무효화.
  - result count는 전체 필터 결과 수를 즉시 표시하되 DOM에는 현재 batch만 존재 가능.
  - empty state는 결과 계산 직후 즉시 결정.

- [ ] **6.3 GREEN — cached archive index 먼저 사용**
  - `ChunbongCache.peek('content:'+API_LIST)` 또는 별도 stable key로 이전 list를 먼저 그린다.
  - 최신 fetch 성공 시 changed payload에서만 목록 재계산.
  - API 실패 시 cached list 유지.

- [ ] **6.4 GREEN — detail extras interaction load**
  - 현재 `mobile-runtime-loader.js`가 contents 페이지 진입 즉시 로드하는
    - `official-wiki-guide.js?v=4`
    - `content-page-enhancements.js?v=7`
    - `chunbong-posts-runtime.js?v=1`
    를 detail-ready 이후로 이동.
  - overview list 화면에서는 이 세 파일을 로드하지 않는다.
  - detail-ready 시 필요한 script를 한 번만 로드; 이미 존재하면 재사용.
  - posts runtime은 상세 탭 DOM이 존재할 때만 시작.
  - `sitewide-polish.js`의 작은 공통 접근성 기능은 유지하되 contents 전용 detail runtime과 분리.

- [ ] **6.5 기존 responsive images 보존**
  - Cloudinary `srcset/sizes`, lazy loading, detail hero priority 정책을 유지.
  - 추가 이미지 API 호출/프록시 호출을 만들지 않는다.

- [ ] **6.6 Tests**
  - Run: `node tests/chunbong-contents-progressive-render-regression.mjs`
  - Run: `node tests/site-structure-performance-v21-regression.mjs`
  - Run local `tests/chunbong-contents-browser-smoke.mjs` / `tests/chunbong-posts-browser-smoke.mjs` when Playwright available; otherwise PR CI workflow 확인.
  - Run: `npm test`

- [ ] **6.7 Commit**
  - `perf: progressively render content archive`

---

## Task 7: PWA app-shell과 정적 캐시 최종 다이어트 + 전체 검증

**Files:**
- Modify: `service-worker.js`
- Modify: `page.js`
- Modify: `tests/pwa-regression.mjs`
- Modify: `test/pwa-cache-contract.test.js`
- Modify: `tests/site-performance-critical-path-regression.mjs`
- Modify: `vercel.json` only if exact-versioned asset cache rule is proven safe
- Modify: `.github/workflows/pwa-browser-smoke.yml` only if new shell file path must be watched

- [ ] **7.1 RED — slimmer app-shell 계약**
  - initial APP_SHELL에서 아래 noncritical 파일을 제거하는 계약:
    - `/site-meta.js`
    - `/site-health.js`
    - `/site-improvements.js`
    - `/site-improvements.css`
    - `/content.js`
  - `/site-shell.js`, `/page.js`, 핵심 CSS, offline, manifest, hero asset은 유지.
  - 모바일 PWA 홈에 꼭 필요한 `mobile-site.js/css`는 기존 offline UX를 보존하기 위해 우선 유지.
  - `site-shell-idle.js`는 mandatory precache에 넣지 않는다.

- [ ] **7.2 GREEN — service worker generation bump**
  - `FALLBACK_VERSION`과 `page.js` fallback을 함께 `runtime-v36`으로 갱신.
  - MIME validation/canonical fallback/network-first 정책은 유지.
  - optional runtime은 첫 정상 네트워크 사용 후 runtime cache로만 들어가게 한다.

- [ ] **7.3 PWA version check를 사용자 critical path에서 더 멀리 이동**
  - service worker registration은 `load` 이후 유지.
  - `/api/version` 확인은 `load` 직후 즉시 CPU/network 경쟁을 만들지 않도록 short idle/timeout으로 예약하되 설치된 PWA 업데이트 발견 기능은 유지.
  - offline/standalone tests가 계속 통과하도록 fallback registration path 보존.

- [ ] **7.4 정적 asset Cache-Control은 안전한 범위만 변경**
  - 광범위한 `.js/.css immutable` 정책은 적용하지 않는다. 기존 HTML에 version 없는 asset이 많아 stale 위험이 있음.
  - 이번 단계에서 query-versioned key runtime에 더 긴 캐시를 적용하려면 exact path + 모든 참조 version bump가 보장되는 경우에만 추가.
  - 그렇지 않으면 현재 `max-age=300, stale-while-revalidate=86400`을 유지하고 Service Worker 캐시 개선만 반영.

- [ ] **7.5 Full static/unit regressions**
  - Run: `npm test`
  - Run: `node tests/site-performance-critical-path-regression.mjs`
  - Run: `node tests/site-shell-regression.mjs`
  - Run: `node tests/site-structure-performance-v21-regression.mjs`
  - Run: `node tests/pwa-regression.mjs`
  - Run: `node tests/changelog-regression.mjs`
  - Run: `node tests/minigame-profile-regression.mjs`
  - Run: `node tests/analytics-redis-budget-regression.mjs`
  - Run all `tests/*.mjs` exactly as Site regression workflow does.

- [ ] **7.6 Browser/visual regressions via one PR**
  - Open one PR from `perf/site-speed-20261004` to `main` after static tests are green.
  - Because `perf/*` Vercel deployment is disabled, the PR should run GitHub browser CI without creating a Vercel Preview build.
  - Require green:
    - Site regression
    - PWA browser smoke
    - Changelog browser smoke
    - Chunbong content archive browser smoke
    - Visual layout audit
    - Browser accessibility
    - Browser runtime quality
  - No Production merge yet if Vercel build-rate-limit is still active.

- [ ] **7.7 Runtime request-budget review**
  - Confirm no new `setInterval` network loops.
  - Confirm search API batch starts only after search interaction.
  - Confirm minigames hub initial load performs no content API call solely because of removed `content.js`.
  - Confirm contents overview does not request detail enhancement assets.
  - Confirm changelog startup calls do not exceed previous count.
  - Confirm analytics sampling constants remain unchanged.

- [ ] **7.8 Commit**
  - `perf: finalize site loading and PWA cache budgets`

---

## Final Integration Checklist

- [ ] Rebase/compare against latest `main` after collector Production situation is resolved so performance branch does not overwrite newer collector/runtime work.
- [ ] Re-run all static/unit regressions on the rebased head.
- [ ] Re-run PR browser checks; do not rely on earlier green SHA after rebase.
- [ ] Verify Vercel build-rate-limit is cleared before merge.
- [ ] Merge only once, avoiding multiple Production builds.
- [ ] After Production READY, verify live URLs for:
  - home menu interaction and overview
  - changelog first render and old history completion
  - minigames hub and profile
  - Chunbong contents list, filter, direct detail, posts preview
  - PWA/service worker update behavior
- [ ] Compare Production network behavior before/after: no extra API polling, no repeated search preload, no duplicate live/content requests.
- [ ] If any performance change causes a functional regression, roll back the smallest task commit rather than reverting the entire collector/runtime merge.
