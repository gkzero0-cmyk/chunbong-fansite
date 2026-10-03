# 춘봉 팬사이트 전반 성능 최적화 설계

## 목표

사용자가 느끼는 "전체적으로 무겁고 메뉴와 각 페이지가 바로 열리지 않는 느낌"을 줄인다. 단순 Lighthouse 점수 개선보다 실제 체감 속도를 우선한다.

성공 기준:
- 메뉴 클릭 직후 즉시 반응이 보인다.
- 첫 화면은 네트워크/API 응답을 기다리지 않고 먼저 그려진다.
- 홈, 업데이트 일지, 미니게임, 춘봉 콘텐츠가 필요한 코드만 먼저 실행한다.
- 두 번째 방문이나 같은 세션 내 이동은 캐시를 활용해 더 빠르게 보인다.
- Redis, Vercel Function, 외부 API 요청량은 늘리지 않고 가능하면 줄인다.
- 기존 PWA, 미니게임 기록, 콘텐츠 수집, 운영자 센터 기능은 유지한다.

## 현재 확인된 병목

### 1. 공통 초기화 코드가 과도하게 많은 역할을 수행
`site-shell.js`는 공통 메뉴/테마뿐 아니라 fetch 래퍼, localStorage snapshot 정리, site-health, site-improvements, personal hub, analytics/meta 등의 초기화를 함께 수행한다.

이 중 일부는 첫 화면을 표시하기 위해 즉시 필요하지 않지만 모든 페이지에서 공통으로 시작된다.

### 2. 페이지별 불필요한 공통 스크립트 로딩
예를 들어 미니게임 허브는 `content.js` 전체를 로드하지만 해당 페이지가 실제로 사용하는 부분은 게임 카드 문구 동기화와 이미지 lazy 설정 정도다.

업데이트 일지도 공통 코드에 더해 changelog 관련 스크립트가 여러 개 직렬로 붙어 있다.

### 3. 데이터 대기형 UI
홈의 오늘 일정, 공지, 최신 콘텐츠, 춘봉 콘텐츠 영역과 업데이트 일지 및 춘봉 콘텐츠 아카이브가 API/데이터 준비 전까지 skeleton 또는 "불러오는 중" 상태를 먼저 보여준다.

이미 last-good/cache 구조가 존재하므로 이전 정상 데이터를 즉시 보여주고 최신 데이터만 뒤에서 갱신하는 방향으로 바꿀 수 있다.

### 4. 페이지 전체 렌더 비용
춘봉 콘텐츠는 대표 시리즈, 연혁, 전체 기록, 상세 데이터까지 한 번에 준비할 가능성이 높고, 업데이트 일지는 전체 변경 이력을 한 번에 렌더하면 DOM 비용이 커질 수 있다.

## 선택한 접근

### A. Critical Path Diet — 최우선
첫 화면에 필요한 코드만 동기적으로 실행하고 나머지는 idle/viewport/interaction 시점으로 미룬다.

즉시 실행:
- 테마 초기값
- 헤더/메뉴 최소 동작
- 현재 페이지 표시
- 첫 화면 핵심 레이아웃
- 필요한 경우 cached last-good 데이터 표시

지연 실행:
- site-health
- site-improvements
- personal hub(해당 페이지 제외)
- analytics/meta 부가 기능
- PWA 업데이트 체크의 네트워크 확인
- 화면 아래쪽 홈 위젯
- 상세 콘텐츠/갤러리

### B. Stale-While-Revalidate UI
현재의 `ChunbongCache`와 budget fetch 구조를 유지하되, 페이지 초기 렌더가 네트워크 결과에 묶이지 않도록 한다.

우선순위:
1. 메모리/세션/localStorage의 last-good가 있으면 즉시 렌더
2. 최신 API는 백그라운드 요청
3. 데이터가 실제로 바뀐 경우에만 DOM 업데이트
4. API 실패 시 기존 정상 데이터 유지

### C. 페이지별 코드 분리
공통 JS를 거대한 만능 파일로 유지하지 않고, 실제 페이지가 필요한 최소 모듈만 불러오게 한다.

예상 분리:
- `shell-core.js`: 메뉴, 테마, 기본 접근성, to-top
- `shell-idle.js`: health, improvements, analytics/meta, 개인화 보조 기능
- 페이지 전용 runtime은 해당 페이지에서만 로드

기존 파일을 한 번에 폐기하지 않고 호환 wrapper를 두어 점진적으로 이전한다.

## 페이지별 설계

### 홈
- hero/header를 최우선 렌더한다.
- `home-overview`, smart status, fortune, archive는 중요도에 따라 분리한다.
- cached overview가 있으면 즉시 표시한다.
- 아래쪽 춘봉 콘텐츠/타로 영역은 viewport 접근 시 로드한다.
- hero 이미지만 high priority를 유지하고 나머지 이미지는 lazy한다.
- 동시에 발생하는 API 호출은 dedupe하고 꼭 필요한 것만 먼저 시작한다.

### 업데이트 일지
- 최신 N개를 우선 렌더하고 과거 기록은 idle 시점에 이어 붙인다.
- 목차는 한 번에 전체 DOM을 만들지 않고 데이터 준비 후 batch 렌더한다.
- changelog 관련 스크립트를 하나의 페이지 전용 entry로 정리할 수 있는지 검토한다.
- cached last-good summary/history를 먼저 표시한다.

### 미니게임 허브
- `content.js` 전체 의존성을 제거하고 필요한 최소 카드/이미지 보조 코드만 남긴다.
- `minigame-profile.js`는 게임 선택 카드가 먼저 그려진 뒤 실행한다.
- hero 이미지는 반응형 `srcset/sizes` 또는 더 작은 모바일 asset을 사용한다.
- 각 실제 게임 페이지는 다른 게임 코드와 계속 격리한다.

### 춘봉 콘텐츠
- 대표 시리즈와 첫 화면에 보이는 카드만 먼저 렌더한다.
- 전체 기록은 chunk/batch 렌더한다.
- 상세 미디어/갤러리/자료는 카드 클릭 후 로드한다.
- 이미지 thumbnail을 실제 표시 크기에 맞춰 사용하고 `srcset/sizes`를 적용한다.
- cached content index가 있으면 skeleton 대신 즉시 마지막 정상 목록을 보여준다.

## 메뉴/내부 이동

### 1차
SPA로 전환하지 않는다. 현재 정적 페이지 구조를 유지한다.

대신:
- 내부 메뉴 hover/focus/touch intent 시 low-priority prefetch
- 같은 origin의 HTML만 제한적으로 prefetch
- Save-Data, 느린 네트워크, 모바일 데이터 환경에서는 prefetch를 비활성화
- 클릭 즉시 `is-navigating` 시각 상태를 적용해 반응성을 높인다.

이 방식은 뒤로가기/PWA/페이지별 초기화 문제를 늘리지 않으면서 체감 전환 시간을 줄일 수 있다.

## PWA 및 캐시

- 서비스워커 등록 자체는 페이지 load 이후에 유지하되 `/api/version` 네트워크 확인을 초기 critical path에서 분리한다.
- CSS/JS/image 정적 asset은 버전된 URL과 장기 캐시를 적극 사용한다.
- HTML은 최신 확인이 가능하도록 `must-revalidate` 정책을 유지한다.
- API last-good/snapshot 캐시는 현재 정책을 재사용하고 중복 네트워크 호출만 줄인다.
- localStorage snapshot prune은 페이지 시작 시 동기 실행하지 않고 idle 시점으로 이동한다.

## 리소스/비용 원칙

성능 최적화를 위해 새로운 Redis polling, cron, Vercel Function, 외부 데이터 요청을 추가하지 않는다.

오히려:
- API 요청 dedupe
- 화면 밖 데이터 지연
- last-good 재사용
- 불필요한 공통 JS 제거
을 통해 Vercel/Redis 사용량을 줄이는 것을 목표로 한다.

## 구현 안전장치

- 기존 페이지별 회귀 테스트를 유지한다.
- 새 성능 회귀 테스트를 추가한다.
- 핵심 계약:
  - 미니게임 허브에서 불필요한 content runtime 미로딩
  - non-critical scripts가 idle/defer되는지
  - 홈의 below-the-fold 기능이 초기 critical path에서 제외되는지
  - cached last-good가 네트워크 전에 표시될 수 있는지
  - 메뉴 prefetch가 Save-Data/느린 연결에서 비활성화되는지
- 시각/접근성/PWA/사이트 회귀 테스트 모두 통과해야 한다.

## 배포 전략

현재 Vercel build-rate-limit 상태이므로 작업은 `perf/site-speed-20261004` 별도 브랜치에서 진행한다.

- main에는 제한 해제 전 불필요한 커밋을 넣지 않는다.
- 구현과 테스트가 완료되어도 즉시 Production 배포를 시도하지 않는다.
- 제한 해제 후 collector bootstrap/runtime 변경과 충돌이 없는 최신 main 기준으로 rebase/merge한다.
- 가능하면 한 번의 Production 배포로 collector 1.5.0과 성능 최적화를 함께 반영한다.

## 제외 범위

이번 1차 작업에서는 다음을 하지 않는다.
- 전체 사이트 SPA 전환
- 새로운 프레임워크 도입
- 데이터 모델 전면 재설계
- Redis 구조 전면 교체
- 미니게임 로직 자체 변경
- 콘텐츠 수집 정책 변경

## 예상 우선순위

1. 공통 shell critical path 경량화
2. 홈 초기 렌더/데이터 우선순위 개선
3. 업데이트 일지 점진 렌더
4. 미니게임 허브 불필요 의존성 제거
5. 춘봉 콘텐츠 점진 렌더/상세 지연 로딩
6. 내부 링크 안전 prefetch
7. 정적 asset cache 및 이미지 반응형 최적화

이 순서로 진행하면 위험도가 낮은 개선부터 체감 효과를 빠르게 확보하면서 뒤쪽 큰 페이지 최적화로 확장할 수 있다.
