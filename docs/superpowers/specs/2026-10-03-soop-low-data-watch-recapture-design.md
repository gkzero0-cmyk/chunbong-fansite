# SOOP 저데이터 감시와 누락 재수집 정확화 설계

날짜: 2026-10-03
대상 저장소: `gkzero0-cmyk/chunbong-fansite`
기준 main: `2735b135494f3f6494cd56e8ca4598f241a8eedf`

## 1. 목적

현재 SOOP 자동 수집은 `#chunbong-soop-watch` 전용 탭을 계속 열어 둔 채 5분마다 전체 SOOP 페이지를 새로고침한다. 이 구조는 동작은 단순하지만, 변화가 없는 동안에도 페이지 HTML·스크립트·스타일·이미지 및 SOOP 내부 요청이 반복될 수 있고 브라우저 탭 하나가 계속 남는다.

이번 변경의 목적은 다음 두 가지를 함께 해결하는 것이다.

1. SOOP 상시 감시를 저데이터 방식으로 변경한다.
   - 영구 SOOP 감시 탭을 없앤다.
   - 기본 확인 주기를 5분에서 15분으로 낮춘다.
   - 운영자 센터가 열려 있을 때만 확인을 예약한다.
   - 확인 시 SOOP 게시판 탭 하나를 잠시 열어 1회 검사하고 자동으로 닫는다.
   - 새 게시글이 발견된 경우에만 실제 게시글 탭을 열어 본문·이미지를 수집한다.
   - 변화가 없으면 팬사이트 서버/Redis에 새 콘텐츠 저장 요청을 만들지 않는다.

2. 선택적 재수집에서 특정 SOOP 글이 조용히 빠지는 문제를 없앤다.
   - 최근 browser import 250개 목록만 보고 판단하지 않는다.
   - 아카이브에 연결된 SOOP 글 ID를 기준으로 현재 browser import 상태를 정확히 조회한다.
   - 각 글이 `재수집 필요 / 이미지 이미 있음 / 내부 자료 / 현재 아카이브에 없음` 중 어떤 이유로 포함·제외됐는지 진단할 수 있게 한다.
   - `208562045`는 구현 후 동일한 일반 로직으로 상태를 확인하고, 이미지 0장이라면 선택적 재수집 계획에 반드시 포함되는지 검증한다. 프로덕션 코드에는 이 ID를 하드코딩하지 않는다.

## 2. 현재 구조와 문제

### 2.1 영구 감시 탭

현재 userscript v1.4.6의 `runSoopWatch()`는 다음 흐름이다.

- 감시 상태를 `watching:true`로 저장
- 1분 heartbeat 기록
- `scanSoopBoard('watch')` 1회 실행
- 5분 대기
- `location.reload()`로 같은 SOOP 페이지 전체를 다시 로드

운영자 페이지의 `operatorBridge()`는 heartbeat가 8분 이상 오래되면 `#chunbong-soop-watch` 탭을 다시 연다. 따라서 사용자가 탭을 닫아도 감시 ON 상태에서는 다시 생긴다.

### 2.2 선택적 재수집 상태의 불투명성

현재 `operator-soop-recapture-guard.js`는 `/api/content?type=operator-content-archive`가 돌려주는 `browserImports`를 Map으로 만들고, 같은 URL의 import에 이미지가 하나라도 있으면 재수집에서 제외한다.

하지만 operator archive 응답의 `browserImports`는 Redis의 최신 250개 index 항목만 읽는다. 이 제한은 운영 비용에는 유리하지만, 재수집 계획의 근거로 쓰면 다음 문제가 생긴다.

- 오래된 글의 현재 import 상태를 정확히 설명할 수 없다.
- 어떤 글이 재수집 계획에서 제외됐는지 이유가 UI에 남지 않는다.
- 실제로 이미지가 0장인지, 현재 아카이브 소스가 빠진 것인지, 내부 자료로 바뀐 것인지 구분하기 어렵다.

`204274449`는 최근 실행에서 collector generation 8이 이미지 4개를 채택한 것이 서버 진단으로 확인됐다. 반면 `208562045`는 같은 실행의 최신 진단 로그에 나타나지 않아, 현재 구조로는 제외 이유를 확정할 수 없다.

## 3. 선택한 아키텍처

### 3.1 운영자 센터가 감시 스케줄러가 된다

브라우저 인증이 필요한 SOOP 글을 다루기 때문에 완전한 서버 전용 감시로 옮기지 않는다. 대신 userscript의 운영자 페이지 인스턴스가 감시 스케줄러 역할을 담당한다.

- `watchEnabled`는 기존 GM storage에 유지한다.
- 감시 기본 주기는 `15 * 60 * 1000`으로 변경한다.
- 운영자 센터가 열려 있을 때만 다음 검사 시각을 예약한다.
- 운영자 센터가 닫혀 있으면 타이머가 존재하지 않으므로 백그라운드에서 SOOP 페이지 로드가 반복되지 않는다.
- 운영자 센터를 다시 열었을 때 감시가 ON이고 예정 시각이 이미 지났다면 1회 즉시 검사한다.

이 방식은 사용자가 승인한 "15분 간격 + 새 글 있을 때만 실제 수집 + 영구 SOOP 탭 제거" 요구와 일치한다.

### 3.2 1회성 SOOP 게시판 검사

새 marker를 사용한다.

- 예: `#chunbong-soop-watch-once`
- 운영자 스케줄러가 예정 시각에 SOOP 게시판 탭 하나를 background로 연다.
- 해당 탭은 기존 `scanSoopBoard('watch')`를 딱 한 번 실행한다.
- `discoverSoopPosts()`는 기존 history/seen 판정을 그대로 사용하므로 신규 글만 게시글 캡처 탭으로 연다.
- 게시판 검사가 끝나면 1회성 탭은 자동으로 닫힌다.
- 더 이상 `location.reload()`를 사용하지 않는다.
- 더 이상 1분 heartbeat를 유지하기 위한 영구 탭이 필요하지 않다.

### 3.3 여러 운영자 탭의 중복 검사 방지

운영자 센터를 여러 탭에서 열 수 있으므로 GM storage에 짧은 browser-local lease를 둔다.

- 키 예: `cb-soop-watch-lease-v1`
- 값: `{ token, claimedAt, expiresAt }`
- 검사 시각이 된 운영자 탭은 임의 token을 기록한 뒤 짧게 재확인한다.
- 자신이 쓴 token이 그대로 남아 있을 때만 SOOP 1회성 검사 탭을 연다.
- lease TTL은 검사 1회보다 긴 약 2분으로 제한한다.
- 검사 종료 또는 TTL 만료 뒤 다음 주기에는 다른 운영자 탭이 정상적으로 이어받을 수 있다.

이 lease는 서버나 Redis를 사용하지 않고 Tampermonkey GM storage 안에서만 동작한다.

### 3.4 상태 표시

운영자 상태판에서 감시 의미를 다음처럼 바꾼다.

- `정상 감시 중 · v1.4.7`
- `SOOP 접근 상태`는 기존 인증 상태 표시 유지
- 다음 확인 예정은 15분 기준 실제 예정 시각
- 영구 watcher heartbeat 대신 최근 1회 검사 완료 시각을 기준으로 정상/지연을 판단
- 사용자가 `상시 감시 중지`를 누르면 다음 예정 시각과 lease를 비우고 추가 검사 탭을 열지 않는다.

수동 `SOOP 신규 글 확인`과 `수집기 지금 점검`은 그대로 유지해 즉시 1회 확인이 가능하게 한다.

## 4. 데이터 사용량 원칙

이번 변경은 "페이지를 더 자주 확인해 정확도를 올리는 것"이 아니라 "변화가 없을 때 아무 일도 하지 않는 것"을 우선한다.

- 기존: 감시 ON 동안 SOOP 전체 페이지를 시간당 약 12회 다시 로드
- 변경: 운영자 센터가 열려 있을 때만 시간당 최대 약 4회 1회성 게시판 확인
- 운영자 센터가 닫혀 있으면 예약 검사 0회
- 신규 게시글이 없으면 게시글 상세 탭 0개
- 신규 게시글이 없으면 콘텐츠 import POST도 0개
- Redis에 감시 heartbeat를 위한 신규 주기성 쓰기를 추가하지 않는다.
- 서버 Cron, 새 Vercel Function, 새 주기성 API polling을 추가하지 않는다.

정적 자산의 브라우저/CDN 캐시는 실제 네트워크 사용량을 더 줄일 수 있지만, 설계상 절감 효과를 캐시 존재에 의존하지 않는다.

## 5. 재수집 계획의 정확한 글별 상태 조회

### 5.1 최근 250개 목록 의존 제거

새 서버리스 함수 파일을 만들지 않고 기존 `/api/content` multiplex route에 owner-only 모드를 추가한다.

예시 type:

`operator-content-soop-recapture-status`

입력:

- `postIds`: 숫자 SOOP 글 ID 배열 또는 comma-separated 값
- 한 요청 최대 80개

서버 동작:

1. owner 인증 필수
2. 요청 ID 검증 및 중복 제거
3. browser import key를 ID 기준으로 한 번의 `MGET`으로 조회
4. 필요하면 같은 ID들의 최근 diagnostic key도 한 번의 `MGET`으로 조회
5. 민감 정보 없이 아래 필드만 반환
   - `postId`
   - `hasImport`
   - `imageCount`
   - `importStoredAt`
   - `diagnosticPhase`
   - `diagnosticAcceptedCount`
   - `diagnosticStoredAt`

본문, 쿠키, 세션, query secret, 전체 browser import payload는 반환하지 않는다.

### 5.2 재수집 planner

클라이언트 planner는 먼저 현재 archive item의 public SOOP source URL을 모두 추출한다. 그 ID들에 대해서만 exact status endpoint를 호출한다.

판정:

- 현재 archive public SOOP source + import 없음 → 재수집
- 현재 archive public SOOP source + import imageCount 0 → 재수집
- 현재 archive public SOOP source + import imageCount > 0 → 이미지 있음으로 제외
- `visibility:'internal'` → 자동 공개 재수집 계획에서 제외
- source 자체가 현재 archive에 없음 → recapture planner 대상이 아님

이렇게 하면 최신 250개 목록에 있느냐 없느냐가 재수집 판정에 영향을 주지 않는다.

### 5.3 제외 사유 진단

운영자 SOOP 진단 UI에는 재수집 실행 직전에 계산한 plan summary를 남긴다.

최소 표시:

- 재수집 필요 N건
- 이미지 이미 있음 N건
- 내부 자료 제외 N건
- 정확 상태 조회 실패 N건

글별 진단 행에는 가능한 경우 다음 중 하나의 상태를 표시한다.

- `재수집 필요 · 이미지 0장`
- `이미지 복구됨 · N장`
- `접근 제한`
- `본문 확인 실패`
- `수집 오류`

planner가 exact status 조회 자체에 실패하면 안전하게 "이미지 있음"으로 추정해서 제외하지 않는다. 대신 해당 public source를 재수집 대상으로 남긴다. 즉 조회 실패가 누락으로 이어지지 않는 fail-open-for-recapture 정책을 사용한다.

## 6. `208562045` 검증 절차

프로덕션 코드에는 ID를 넣지 않는다. 다만 배포 검증에서 이 글을 관찰 대상으로 사용한다.

1. 새 exact status 로직으로 현재 archive의 public SOOP source 목록을 계산한다.
2. `208562045`가 archive source에 존재하는 경우:
   - imageCount가 0이면 plan에 포함되는지 확인
   - 순차 재수집 후 새 diagnostic이 서버에 저장되는지 확인
   - acceptedCount/imageCount 결과를 확인
3. archive source에 존재하지 않는 경우:
   - "재수집에서 빠진 이유 = 현재 archive source 부재"로 확정
   - 원래 연결돼야 하는 콘텐츠의 source 데이터 손실 여부를 별도 수정한다.
4. import imageCount가 이미 1 이상인 경우:
   - "재수집에서 빠진 이유 = 서버에 이미지 있는 browser import가 이미 존재"로 확정
   - 실제 공개 콘텐츠가 그 import를 반영하지 못한다면 recapture가 아니라 연결/표시 계층의 문제로 분리해 수정한다.

이 절차로 `208562045`가 왜 최신 재수집 로그에 없었는지를 추측이 아니라 데이터로 확정한다.

## 7. 버전과 배포

감시 주체와 userscript 실행 흐름 자체가 바뀌므로 userscript는 `v1.4.7`로 올린다.

- `@version 1.4.7`
- runtime `VERSION='1.4.7'`
- 감시 interval 15분
- media collector generation 8은 그대로 유지한다. 이번 변경은 미디어 판정 알고리즘 세대 변경이 아니므로 불필요한 전체 재수집을 유발하지 않는다.

운영자 페이지의 module import cache key도 watcher/re-capture 관련 변경 파일에 맞게 함께 올려 이전 코드 캐시 재사용을 방지한다.

사용자는 배포 후 Tampermonkey에서 userscript를 v1.4.7로 한 번 업데이트해야 한다.

## 8. 테스트

### userscript watcher regression

- `SOOP_WATCH_INTERVAL_MS === 15 * 60 * 1000`
- 영구 감시 경로에서 `location.reload()`가 사라짐
- 1회성 watch marker가 존재
- 1회 검사 후 `window.close()` 계약 존재
- 운영자 페이지가 닫혀 있으면 서버/Redis polling을 만드는 코드가 없음
- watch lease가 GM storage 기반이며 서버 저장을 하지 않음
- new post discovery는 기존 `soopHandled()` 필터를 유지

### recapture planner regression

- 최신 250 browserImports 배열만으로 최종 판정하지 않음
- exact status route 사용
- imageCount 0 → 재수집
- imageCount > 0 → 제외
- exact lookup 실패 → public source 재수집 유지
- production code에 `208562045` 또는 `204274449` 하드코딩 없음
- exact status 조회는 bounded MGET이며 전체 Redis scan을 하지 않음

### 기존 회귀

- Site regression
- Operator center browser smoke
- Visual layout audit
- 기존 SOOP recapture regression
- userscript 문법 검사

## 9. 배포 후 검증

1. Vercel Production이 새 main SHA로 READY인지 확인
2. Production userscript가 v1.4.7인지 직접 fetch
3. Production operator modules cache key 확인
4. runtime errors/warnings 확인
5. 사용자가 userscript v1.4.7로 업데이트 후 운영자 센터 새로고침
6. 상시 감시 시작 시 영구 `#chunbong-soop-watch` 탭이 남지 않는지 확인
7. 1회성 검사 탭이 검사 후 닫히는지 확인
8. 선택적 재수집을 한 번 실행해 `208562045`의 inclusion/exclusion reason을 확인
9. `204274449`는 현재 이미지가 복구된 상태라 재수집 대상에서 제외되는지 확인

## 10. 비목표

이번 변경에서는 다음을 하지 않는다.

- SOOP의 비공개 내부 API를 역공학해 직접 polling하지 않는다.
- 로그인 쿠키/세션 토큰을 서버로 보내지 않는다.
- 서버 Cron으로 로그인/애청자 글을 감시하지 않는다.
- 감시 정확도를 이유로 더 짧은 주기를 도입하지 않는다.
- Redis 사용량 모니터링 구조를 새로 만들지 않는다.
- 미디어 필터 알고리즘 generation을 올려 불필요한 전체 backfill을 유발하지 않는다.
