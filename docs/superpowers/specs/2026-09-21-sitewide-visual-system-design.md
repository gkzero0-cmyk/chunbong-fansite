# 팬사이트 전역 시각 시스템 통일 설계

## 목표

2026-09-21 홈 개편에서 확정한 디자인 언어를 팬사이트 전체로 확장한다. 현재 페이지마다 서로 다른 주황색 강조, 유사한 기능색, 낮은 텍스트 대비, 숫자 중심 장식, 알림센터/그래프의 별도 스타일이 섞여 있어 정보 구조는 같아도 시각적으로 한 제품처럼 느껴지지 않는 문제가 있다.

이번 작업의 목표는 다음 네 가지다.

1. 기능별 색과 아이콘을 사이트 전체에서 같은 의미로 반복한다.
2. 다크/라이트 모두 본문과 보조문구 가독성을 높인다.
3. 현재 페이지·현재 섹션·hover/open 상태를 헤더에서 명확히 분리한다.
4. 홈, 각 기능 페이지, 최근 업데이트, 검색, MY 팬허브, 춘봉 데이터 그래프가 하나의 디자인 시스템을 공유하게 한다.

기존 기능, 정보 구조, URL, 데이터 로딩 방식은 유지한다.

## 핵심 원칙

### 브랜드색과 기능색을 분리한다

춘봉 브랜드 주황색은 다음 용도로만 사용한다.

- 현재 페이지의 가장 강한 선택 상태
- 핵심 CTA
- 팬사이트 공통 브랜드 강조
- D-day 및 브랜드 계열 장식

기능 식별은 각 카테고리의 고유 색과 아이콘이 담당한다. 같은 기능은 홈, 헤더 하위 메뉴, 페이지 히어로, 카드, 알림센터, 검색 결과에서 동일한 색과 아이콘을 사용한다.

### 색은 기능을 구분하고, 글자는 읽히게 한다

설명문과 본문은 기능색으로 물들이지 않는다. 기능색은 아이콘, 라벨, 얇은 accent line, badge, hover border 정도에 사용하고 실제 읽어야 하는 제목/본문은 고대비 중립색을 사용한다.

### 색만으로 상태를 전달하지 않는다

현재 페이지는 색 외에 배경 채움, 글자 굵기, 아이콘, aria-current를 함께 사용한다. 알림/상태 표시도 아이콘·텍스트를 함께 사용한다.

## 전역 디자인 토큰

공통 CSS 토큰을 추가한다. 구현 위치는 별도 전역 디자인 시스템 CSS 파일을 우선하되, 기존 로딩 순서를 깨지 않도록 site-shell 또는 공통 HTML에서 한 번만 로드한다.

### 텍스트 토큰

다크 모드:

- --text-primary: #F8F5F2
- --text-secondary: #D1CBC5
- --text-muted: #AAA29B
- --text-meta: #88817B
- --text-disabled: #68635F

라이트 모드:

- --text-primary: #1D1815
- --text-secondary: #4B433D
- --text-muted: #69605A
- --text-meta: #827971
- --text-disabled: #A49C95

기존 하드코딩된 #777, #888, #aaa 계열은 사용자에게 실제로 읽혀야 하는 위치부터 단계적으로 위 토큰으로 교체한다. 장식용 또는 비활성 요소는 낮은 대비를 유지할 수 있다.

### 기능별 색상

다크/라이트는 같은 hue를 유지하되 라이트 모드에서는 더 어둡고 진한 값을 사용한다.

| 기능 | 아이콘 | 다크 | 라이트 |
| --- | --- | --- | --- |
| 방송 일정 | ◷ | #4ADE80 | #168447 |
| 공지 | ! | #FF8A3D | #C9500A |
| 다시보기 | ▶ | #4CC9FF | #0876A8 |
| 핫클립 | ⚡ | #668CFF | #3456C8 |
| 팬아트 | ✦ | #FF82C6 | #C43A83 |
| YouTube | ▷ | #FF6464 | #C93434 |
| 타로 | ✧ | #B58AFF | #743AC1 |
| 미니게임 | ◆ | #FFD05A | #A66A00 |
| 방송 이력 | ↺ | #AEB9C8 | #596879 |
| 춘봉 데이터 | ▥ | #48E0C2 | #087F6B |
| 방송 기록 캘린더 | ▦ | #B7E75C | #658800 |

아이콘은 기존 Unicode/간단한 inline SVG를 우선 사용한다. 외부 아이콘 라이브러리는 추가하지 않는다.

## 홈

현재 홈 개편 구조는 유지한다.

- 바로가기 4개 카드에 위 전역 토큰을 사용한다.
- 전체 메뉴의 기능별 아이콘과 색도 같은 토큰을 사용한다.
- 유사했던 색 조합을 새 팔레트로 분리한다.
  - 타로/팬아트/방송 이력
  - 미니게임/캘린더
  - 방송 일정/데이터
  - 다시보기/핫클립
- 카드 설명문은 기능색이 아니라 --text-secondary 또는 --text-muted를 사용한다.
- 영문 라벨은 기능색을 사용하되 최소 11px, weight 800 이상을 기준으로 한다.

## 개별 페이지 정체성

각 기능 페이지에는 해당 기능의 색과 아이콘을 동일하게 적용한다.

대상:

- schedule.html
- notice.html
- vod.html
- clips.html
- fanart.html
- youtube.html
- tarot.html
- minigames.html 및 4개 게임 진입 페이지의 팬사이트 공통 영역
- history.html
- data.html
- data.html?view=calendar#soop의 방송 기록 캘린더
- myhub.html에서 기능별 콘텐츠 목록
- changelog.html의 기능 카테고리 표시

적용 범위:

- page kicker/eyebrow
- 주요 badge
- 선택된 탭
- 카드의 accent line 또는 아이콘
- hover border
- 기능 페이지의 대표 아이콘

큰 제목과 본문은 기능색으로 바꾸지 않는다.

## 헤더 상태

헤더는 네 상태를 분리한다.

### 기본

- 다크: 밝은 회백색 텍스트
- 라이트: 진한 회갈색 텍스트
- 배경은 중립
- 충분한 기본 대비를 확보한다.

### Hover/Open

- 현재 페이지처럼 보이지 않도록 중립적인 배경/테두리 변화만 사용한다.
- 다크: 글자는 흰색
- 라이트: 글자는 거의 검정
- 브랜드 주황 채움은 사용하지 않는다.

### 현재 섹션

예: 다시보기 페이지의 상위 '영상' 메뉴.

- 해당 기능군임을 보여주는 옅은 accent background + accent border
- 글자 weight 900
- 현재 페이지보다 한 단계 약한 강조

### 현재 페이지

예: HOME 또는 드롭다운 내부의 다시보기.

- 브랜드 주황 채움
- 다크: 어두운 글자
- 라이트: 흰 글자
- 가장 강한 active 상태
- aria-current="page" 유지/보강

드롭다운 내부에서도 정확한 현재 하위 페이지를 같은 방식으로 표시한다.

## 최근 업데이트 / 종 아이콘

종 버튼 자체는 헤더의 중립 유틸리티 스타일을 유지한다. 새 소식 여부를 보여주는 unread dot은 브랜드 주황 또는 명확한 상태색으로 유지하되 지나치게 붉은 경고 느낌은 피한다.

패널 내부 각 항목은 기능 종류에 따라 전역 기능색/아이콘을 사용한다.

- 일정 → 초록 + ◷
- 공지 → 오렌지 + !
- 다시보기/일반 영상 → 하늘색 + ▶
- 핫클립 → 코발트 + ⚡
- 팬아트 → 핑크 + ✦
- YouTube/Shorts → 레드 + ▷
- 타로/미니게임/데이터 관련 항목이 생기면 동일 토큰을 재사용

현재 문자열 앞 두 글자를 넣는 activity-type-icon 방식은 가능한 경우 의미 아이콘으로 교체한다. 썸네일이 있는 항목은 썸네일을 유지하되 meta 라벨은 기능색을 사용한다.

## 검색과 MY 팬허브

통합검색 결과와 MY 팬허브의 보관함/최근 항목도 같은 기능색을 사용한다.

- 결과 제목/본문은 고대비 중립 텍스트
- 타입 badge/icon만 기능색
- 선택/hover 상태는 기능색 border 정도로 제한
- 저장됨/고정됨 등 개인 상태는 브랜드 주황을 사용하여 기능색과 역할을 분리한다.

## 춘봉 데이터 그래프

현재 SVG 그래프 포인트에는 custom tooltip과 <title>이 함께 있어 브라우저 기본 흰 툴팁이 중복 표시된다.

수정:

1. 포인트 내부의 SVG <title> 제거
2. tabindex와 aria-label은 유지해 키보드 접근성 보존
3. custom tooltip만 사용
4. 데이터 페이지 기능색인 터쿼이즈를 crosshair, active point, tooltip border/accent에 적용
5. tooltip 내부
   - 날짜/라벨: --text-muted
   - 값: --text-primary
   - 배경: 높은 불투명도의 panel
6. hover/focus 시 해당 포인트의 고정 value label을 흐리거나 숨겨 중복 텍스트 제거
7. 상단 포인트는 tooltip을 아래로, 일반 포인트는 위로 배치할 수 있도록 위치 계산 보완
8. 좌우 가장자리에서 tooltip이 chart viewBox 밖으로 나가지 않도록 clamp
9. focus-visible에서도 hover와 동일한 정보를 표시

기존 그래프 데이터 계산과 수치 포맷은 변경하지 않는다.

## 라이트/다크 모드

기능색은 mode별 별도 값을 사용한다.

라이트 모드에서 특히 다음을 방지한다.

- 흰 배경 위 밝은 파스텔 텍스트
- 회색과 베이지가 섞여 본문이 흐려지는 현상
- 현재 메뉴와 hover 메뉴가 같은 톤으로 보이는 현상

다크 모드에서는 본문 회색이 지나치게 어두워지지 않도록 --text-secondary/--text-muted 기준을 강제한다.

## 접근성

- 실제 본문/설명은 가능한 WCAG AA 수준의 대비를 목표로 한다.
- 색만으로 active/type을 구분하지 않는다.
- aria-current, aria-selected, aria-label 유지
- focus-visible은 모든 테마에서 분명해야 한다.
- prefers-reduced-motion은 기존 규칙을 유지한다.
- SVG 그래프 <title> 제거 후 aria-label을 회귀 테스트한다.

## 구현 구조

권장 구조:

- 새 공통 CSS: site-design-system.css
  - 텍스트 토큰
  - 기능별 accent 토큰
  - 공통 category badge/icon 규칙
  - 라이트/다크 override
- site-shell.js 또는 공통 HTML 로딩 경로에서 위 CSS를 모든 일반 페이지에 주입
- site-quality.css
  - 헤더 상태 규칙을 공통 토큰 기반으로 교체
- home-refresh.css
  - 홈 전용 색 하드코딩을 공통 토큰 참조로 교체
- activity-center.css/js
  - 유형별 토큰/아이콘 적용
- data-soop-periods-v3.js, data-enhancements.css/data-soop-periods-v2.css
  - 툴팁 중복 제거 및 DATA accent 적용
- 각 기능 페이지 전용 CSS
  - 필요할 때만 page-level accent 매핑
- personal-hub.css, 검색 관련 CSS
  - 텍스트 대비와 category mapping 적용

페이지마다 색 값을 다시 하드코딩하지 않는다.

## 비범위

- 페이지 구조 전체 재배치
- 기능/URL 변경
- 새 아이콘 패키지 설치
- 게임 내부 고유 보드 색상 재설계
- 타로 카드 자체 아트/foil 효과 변경
- SOOP/YouTube 데이터 수집 방식 변경
- 알림 동작/Push 로직 변경

## 테스트

### 정적 회귀

새 회귀 테스트에서 다음을 검증한다.

- 11개 기능색 토큰이 모두 존재하고 서로 다른 색상
- light/dark 토큰 모두 존재
- 홈 카드가 하드코딩 색 대신 공통 토큰을 사용
- 헤더 default/hover/section/current page 규칙 존재
- 현재 페이지는 aria-current 또는 active 상태와 연결
- activity center 타입 매핑이 공통 기능 분류와 일치
- 데이터 그래프 point markup에 <title>이 없음
- 그래프 point aria-label/tabindex 유지
- custom tooltip 유지

### 브라우저 회귀

PC dark/light:

- HOME active가 가장 강함
- 방송/영상/팬존/기록 dropdown hover/open과 현재 섹션 상태가 시각적으로 다름
- 하위 페이지에서 정확한 submenu item이 active
- 홈 바로가기/전체 메뉴 기능색이 서로 분리됨
- 최근 업데이트 패널 항목 타입별 색/아이콘 표시
- 본문/보조 텍스트가 dark/light에서 읽기 쉬움

DATA:

- hover 시 custom tooltip 하나만 보임
- 브라우저 native tooltip이 생성되지 않음
- 포인트 값과 tooltip 텍스트가 중복 겹침하지 않음
- 첫/마지막 포인트 tooltip이 잘리지 않음
- keyboard focus로 tooltip 표시

모바일:

- 기존 58px 헤더/PWA bottom nav 레이아웃 유지
- 색/텍스트 대비 변경으로 overflow 발생하지 않음

### 기존 회귀

기존 site regression, recent update browser audit, mobile/PWA, tarot, minigame 관련 회귀는 모두 유지한다.

## 완료 기준

- 홈과 각 페이지에서 같은 기능은 같은 색과 아이콘을 사용한다.
- 서로 유사했던 주요 기능색이 시각적으로 명확히 분리된다.
- 다크/라이트 모두 제목·본문·보조문구의 단계가 분명하고 읽기 쉽다.
- 헤더에서 현재 페이지, 현재 섹션, hover/open 상태가 혼동되지 않는다.
- 최근 업데이트와 검색/MY 팬허브도 같은 기능 분류를 사용한다.
- 춘봉 데이터 그래프에서 흰 기본 툴팁이 사라지고 custom tooltip 하나만 표시된다.
- 기존 기능과 모바일/PWA 동작에 회귀가 없다.
- Production 배포 후 main SHA와 /api/version이 synced:true이며 Vercel runtime error가 없다.
