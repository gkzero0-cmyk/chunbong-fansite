# 춘봉 콘텐츠 게시글 공통 렌더링 개선 설계

## 목적

춘봉 콘텐츠 전체의 `게시글` 탭을 공통 규칙으로 정리한다. 적자생존 한 콘텐츠만 임시로 고치는 것이 아니라, 모든 콘텐츠에서 게시글이 최신 소식 확인에 적합하도록 정렬·중복 제거·본문 펼침/접힘 동작을 통일한다.

성공 기준은 다음과 같다.

- 게시글은 날짜 내림차순(최신 → 과거)으로 표시된다.
- 날짜가 없거나 확인되지 않은 글은 확인 가능한 날짜의 글 뒤에 표시된다.
- 같은 SOOP 게시글 또는 같은 canonical URL은 한 번만 표시된다.
- `timeline`과 `media` 양쪽에 같은 글이 있어도 카드 한 개로 합쳐진다.
- 게시글을 열고 닫아도 DOM의 게시글 카드 개수는 변하지 않는다.
- 본문은 기존 카드 안에서만 펼쳐지고 접힌다.
- SOOP 원문, 본문, 이미지의 지연 로딩과 세션 캐시는 유지한다.
- `기록` 탭의 시간 흐름 정렬은 변경하지 않는다.
- 추가 Redis 조회, 새 서버리스 함수, 주기적 폴링을 만들지 않는다.

## 현재 문제

### 1. 게시글 배열이 정렬되지 않음

현재 `chunbong-contents.js`의 `renderPosts()`는 `timeline`과 `media`를 합친 다음 `notice`, `post`, `article`, `reference` 타입만 필터링하고 입력 순서 그대로 렌더링한다. 따라서 데이터가 수집·병합된 순서에 따라 날짜가 뒤섞인다.

### 2. 중복 제거 규칙이 없음

같은 SOOP 게시글이 `timeline`과 `media`에 동시에 존재하거나 동일 URL이 여러 구조화 경로를 통해 들어오면 `renderPosts()`가 이를 서로 다른 행으로 취급한다.

### 3. 본문 미리보기가 별도 카드를 삽입함

현재 `content-page-enhancements.js`는 게시글 링크를 클릭하면 원래 링크 다음에 `.archive-source-notice` `<article>`을 새로 삽입하고 원래 링크를 숨긴다. 이 구조는 재렌더링·상태 변경·CSS 조건에 따라 원래 행과 새 카드가 함께 남거나, 닫은 뒤 별도 카드가 보이는 문제를 만들 수 있다.

## 설계 결정

### A. 게시글 정규화 계층 도입

`chunbong-contents.js`에 게시글 후보를 정규화하는 순수 함수 계층을 추가한다.

예상 함수 경계:

- `postCanonicalKey(row)`
  - SOOP URL이면 `/station/chunbongtv/post/<id>`의 `<id>`를 우선 키로 사용한다.
  - 그 외에는 URL의 불필요한 query/hash를 제거한 canonical URL을 사용한다.
  - URL이 없으면 안정적인 fallback 키를 사용하되, 서로 다른 글을 과도하게 합치지 않는다.

- `mergePostRows(primary, candidate)`
  - 같은 글로 판단된 두 레코드를 한 레코드로 합친다.
  - 실제 제목, 더 정확한 날짜, URL, note/본문 연결에 유리한 필드를 우선한다.
  - placeholder 제목보다 구체적인 제목을 우선한다.

- `normalizePostRows(item)`
  - `timeline + media`에서 게시글 후보를 수집한다.
  - 타입 필터링을 수행한다.
  - canonical key 기준으로 중복 제거·병합한다.
  - 날짜 내림차순으로 정렬한다.
  - 날짜 없는 행을 마지막으로 보낸다.
  - 같은 날짜는 SOOP post id 또는 canonical key로 안정 정렬한다.

이 함수들은 DOM에 의존하지 않는 순수 로직으로 만들어 단위 테스트가 가능하게 한다.

### B. `renderPosts()`는 정규화 결과만 렌더링

`renderPosts()`는 원시 `timeline/media` 배열을 직접 다루지 않고 `normalizePostRows(item)`의 결과만 사용한다.

게시글 카드에는 다음을 포함한다.

- 제목
- 자료 타입
- 날짜
- 외부 원문 링크 상태
- 펼침/접힘용 식별자

초기 렌더 시 각 게시글은 하나의 `.archive-post-card` 컨테이너를 가진다. 게시글 카드 수와 정규화 결과 개수는 항상 일치해야 한다.

### C. 단일 카드 내부 펼침/접힘

`content-page-enhancements.js`의 기존 `buildNotice(anchor)` 방식은 폐기하거나 호환 래퍼로 축소한다.

새 흐름:

1. `renderPosts()`가 카드와 빈 detail 영역을 함께 렌더링한다.
2. 사용자가 카드의 `본문 펼치기`를 누른다.
3. enhancement 스크립트는 같은 카드 내부의 detail 영역을 찾는다.
4. 아직 로드하지 않았다면 기존 `sourcePreview` API를 호출한다.
5. 본문/이미지를 같은 카드 내부 detail 영역에 주입한다.
6. 이후 펼침/접힘은 class/`hidden`/`aria-expanded`만 변경한다.
7. 새 sibling `<article>`을 삽입하지 않는다.

따라서 열기·닫기 횟수와 관계없이 게시글 카드 수가 늘어나지 않는다.

### D. 기존 지연 로딩·캐시는 유지

현재 `content-page-enhancements.js`의 장점은 유지한다.

- 클릭 전에는 source preview API를 호출하지 않는다.
- `previewCache` 메모리 캐시를 유지한다.
- `sessionStorage` TTL 캐시를 유지한다.
- 본문을 이미 로드한 카드는 다시 fetch하지 않는다.

즉, 이번 변경은 데이터 사용량을 늘리지 않고 DOM 구조와 정렬·중복 처리만 개선한다.

## 데이터 우선순위

중복 레코드 병합 시 다음 우선순위를 사용한다.

### 제목

1. 실제 수집 제목
2. 구조화된 구체적 제목
3. 일반/placeholder 제목

`공식 게시글`, `게시글`, 숫자 ID만 있는 제목 등은 더 구체적인 제목이 있으면 대체한다.

### 날짜

1. `YYYY-MM-DD` day precision
2. month/year precision
3. unknown

### URL

1. SOOP 원문 canonical URL
2. 유효한 외부 원문 URL
3. 없음

동일 SOOP post id의 URL 변형은 같은 글로 취급한다.

## 정렬 규칙

게시글 탭의 정렬은 다음 순서로 고정한다.

1. 유효한 날짜가 있는 글이 먼저 온다.
2. 날짜는 내림차순이다.
3. 같은 날짜의 SOOP 글은 post id 내림차순을 사용한다.
4. 같은 날짜의 비-SOOP 글은 canonical key로 안정 정렬한다.
5. 날짜가 없는 글은 맨 아래에 두고 안정 정렬한다.

`기록` 탭은 기존 시간순 정렬을 유지한다. 게시글과 기록의 목적이 다르기 때문이다.

## UI 동작

각 카드의 상태는 두 가지뿐이다.

- collapsed: 제목/타입/날짜/원문 링크/`본문 펼치기`
- expanded: 위 정보 + 본문/이미지 + `본문 접기`

접기 시 본문 DOM은 제거하지 않고 숨긴다. 다시 펼칠 때 네트워크 요청 없이 즉시 보여준다.

원문 링크 클릭은 본문 펼침 이벤트와 분리한다.

## 호환성

### 기존 SOOP source preview

기존 `/api/content?type=chunbong-content&id=...&sourcePreview=1...` 호출 계약은 변경하지 않는다.

### FMKorea 등 지원 원문

현재 `sourceEligible()`가 지원하는 SOOP/FMKorea 범위를 유지한다. 카드 구조만 바꾸고 원문 preview 가능 여부 판단은 유지한다.

### 다른 콘텐츠 탭

- 소개: 변경 없음
- 가이드: 변경 없음
- 기록: 정렬 정책 변경 없음
- 영상: 변경 없음
- 참가자·결과: 변경 없음
- 이미지: 변경 없음
- 자료: 변경 없음

## 오류 처리

- preview fetch 실패: 카드 내부에 실패 문구와 원문 링크를 표시한다.
- 본문 없음: 카드 내부에 저장 본문 없음 상태를 표시한다.
- 이미지 없음: 본문만 표시한다.
- 날짜 없음: `날짜 확인 중`을 표시하고 목록 맨 아래로 보낸다.
- 잘못된 URL: 외부 링크는 렌더링하지 않되 카드 자체는 유지한다.

오류가 나더라도 별도 카드나 placeholder sibling을 추가하지 않는다.

## 테스트 전략

### 단위/회귀 테스트

새 회귀 테스트에서 최소 다음을 검증한다.

1. `normalizePostRows()`가 최신 날짜부터 정렬한다.
2. 날짜 없는 행은 마지막이다.
3. 같은 SOOP post id URL 변형은 하나로 합쳐진다.
4. `timeline`과 `media`에 같은 URL이 있어도 결과는 하나다.
5. 중복 병합 시 더 구체적인 제목과 정확한 날짜가 보존된다.
6. 같은 날짜의 정렬이 실행마다 안정적이다.
7. `renderPosts()` 카드 수가 normalized row 수와 같다.
8. `content-page-enhancements.js`가 새 sibling `.archive-source-notice`를 삽입하지 않는다.
9. 펼침/접힘 후 카드 수가 변하지 않는다.
10. 이미 로드한 preview를 다시 fetch하지 않는다.

### 전체 콘텐츠 감사

공개 춘봉 콘텐츠 상세 JSON을 기준으로 각 콘텐츠의 게시글 후보를 검사한다.

- 정렬 위반 0건
- canonical 중복 0건
- placeholder 제목이 더 좋은 제목을 덮는 경우 0건
- 날짜 없는 행이 날짜 있는 행 사이에 끼는 경우 0건

감사 스크립트는 테스트/검증 용도로만 사용하고 런타임 폴링을 추가하지 않는다.

### Production 검증

배포 후 대표 콘텐츠와 전체 데이터 감사 결과를 확인한다.

대표 UI 검증:

- 적자생존 게시글 탭
- 레오펠 게시글 탭
- 게시글 수가 많은 다른 콘텐츠 1개 이상

각 대표 콘텐츠에서 다음을 확인한다.

- 최신순
- 중복 없음
- 열기 → 접기 → 다시 열기 동작
- 카드 개수 유지
- 원문 링크 정상
- 본문/이미지 preview 정상
- 콘솔/runtime error 없음

## 변경 예상 파일

- `chunbong-contents.js`
  - 게시글 정규화/중복 병합/정렬
  - 단일 카드 markup
- `content-page-enhancements.js`
  - 새 sibling 카드 삽입 제거
  - 기존 카드 내부 preview 로딩/토글
- `content-page-enhancements.css`
  - 단일 카드의 collapsed/expanded 상태 스타일 보정이 필요한 경우에만 최소 변경
- `tests/...`
  - 게시글 정렬·중복·단일 카드 회귀 테스트
  - 전체 콘텐츠 감사 테스트 또는 스크립트

## 비범위

이번 작업에서 하지 않는다.

- `기록` 탭을 최신순으로 변경
- 수집기 재설계
- Redis 구조 변경
- 새 API endpoint 추가
- 새 Vercel serverless function 추가
- 자동 수집 주기 변경
- 다른 탭의 대규모 디자인 개편

## 완료 정의

다음 조건이 모두 충족되면 완료로 본다.

- 회귀 테스트 통과
- 전체 콘텐츠 게시글 감사 통과
- PR CI 통과
- Production READY
- 적자생존 포함 대표 콘텐츠에서 최신순/중복 없음/단일 카드 토글 확인
- Production runtime error/warning/fatal에 이번 변경 관련 신규 오류 없음
