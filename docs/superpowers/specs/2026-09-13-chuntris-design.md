# 춘트리스 웹게임 설계

## 1. 목적

춘봉 팬사이트 안에서 바로 플레이할 수 있는 테트리스형 웹게임 **춘트리스**를 만든다. 사용자가 제공한 춘봉 캐릭터 이미지 20장을 게임 상태별 리액션에 활용하고, PC와 모바일 모두에서 플레이 가능한 독립 페이지로 제공한다.

첫 버전은 두 가지 모드를 지원한다.

- **클래식 무한모드**: 점수, 레벨, 콤보, 최고점수를 중심으로 계속 플레이한다.
- **40줄 타임어택**: 40줄을 제거할 때까지의 시간을 측정하고 개인 최고기록을 저장한다.

외부 게임 엔진이나 프레임워크는 사용하지 않는다. 기존 팬사이트의 정적 HTML/CSS/JavaScript 구조에 맞춰 Canvas 기반으로 구현한다.

## 2. 사용자 경험 목표

- 처음 들어온 사용자가 별도 설명 없이 바로 시작할 수 있어야 한다.
- 테트리스에 익숙한 사용자는 현대식 조작감으로 자연스럽게 플레이할 수 있어야 한다.
- 게임 중 춘봉 캐릭터의 표정이 플레이 상황과 연결되어 팬사이트만의 개성이 느껴져야 한다.
- PC 키보드와 모바일 터치 모두 동일한 게임 규칙을 사용해야 한다.
- 최고점수와 40줄 최고기록은 새로고침 후에도 유지되어야 한다.

## 3. 페이지 구조

새 페이지는 `chuntris.html`로 만든다. 기존 사이트 헤더, 푸터, 내비게이션 스타일을 그대로 사용하고 메인 내비게이션에 `춘트리스` 항목을 추가한다.

페이지 전용 파일은 다음 구조를 사용한다.

- `chuntris.html`: 게임 화면과 접근성용 컨트롤 마크업
- `chuntris.css`: 보드, 패널, 모바일 조작부, 상태 효과 스타일
- `chuntris-engine.js`: 순수 게임 규칙과 상태 전이
- `chuntris.js`: Canvas 렌더링, 입력, UI 바인딩, 저장, 리액션 연결
- `chuntris-audio.js`: Web Audio 기반 효과음
- `assets/chuntris/*`: 사용자 제공 춘봉 이미지의 웹 최적화 사본

게임 규칙을 UI에서 분리해 엔진을 직접 테스트할 수 있게 한다.

## 4. 화면 배치

### 데스크톱

화면 중앙에 10×20 플레이 보드를 크게 배치한다.

- 왼쪽: `HOLD`, 조작법 요약
- 중앙: 10×20 Canvas 보드
- 오른쪽 상단: `NEXT` 5개
- 오른쪽 중단: 점수, 레벨, 삭제 줄, 시간, 최고기록
- 오른쪽 하단: 춘봉 리액션 캐릭터
- 게임 상단: 모드 선택, 새 게임, 일시정지, 효과음/음량

### 모바일

- 보드를 화면 폭에 맞춰 가장 크게 유지한다.
- HOLD/NEXT/상태 정보는 보드 위아래의 compact panel로 재배치한다.
- 하단에 터치 컨트롤을 고정한다.
- 세로 화면에서 페이지 스크롤이 게임 조작을 방해하지 않도록 게임 영역의 touch action을 제한한다.

## 5. 게임 규칙

### 공통 보드

- visible board는 10열 × 20행이다.
- 엔진 내부 board는 상단 스폰 여유를 위해 2개의 hidden row를 포함한 10열 × 22행으로 관리한다.
- 블록 종류는 I, O, T, S, Z, J, L 7종이다.

### 랜덤 방식

- **7-bag**을 사용한다.
- 매 bag마다 7종 블록이 정확히 한 번씩 들어간다.
- queue는 항상 최소 5개의 다음 블록을 보장한다.

### 이동과 회전

- 좌우 이동
- Soft Drop
- Hard Drop
- 시계방향 회전
- 반시계방향 회전
- Hold
- Ghost piece
- 표준 SRS kick table에 따른 wall kick
- 바닥 접촉 후 500ms lock delay

키보드와 모바일 long press 반복은 초기 지연 DAS 150ms, 반복 간격 ARR 40ms를 사용한다. 첫 버전에서는 사용자가 이 값을 변경하는 설정 UI는 제공하지 않는다.

### Hold

- 한 블록이 필드에 고정되기 전까지 Hold는 한 번만 사용할 수 있다.
- Hold 슬롯이 비어 있으면 현재 블록을 저장하고 queue의 다음 블록을 가져온다.
- Hold 슬롯에 블록이 있으면 현재 블록과 교환한다.
- 새 블록이 필드에 고정된 뒤에만 `canHold`가 다시 활성화된다.

### 게임오버

새 블록이 정상적으로 스폰되지 못하면 게임오버로 처리한다.

## 6. 클래식 무한모드

### 기본 점수

라인 삭제 기본 점수는 현재 레벨을 곱한다.

- Single: 100 × level
- Double: 300 × level
- Triple: 500 × level
- Tetris: 800 × level
- Soft Drop: 실제 내려간 1칸당 +1
- Hard Drop: 실제 내려간 1칸당 +2

### T-Spin, Combo, Back-to-Back

T-Spin은 마지막 성공 동작이 T 블록 회전이고, 고정 시 T 회전 중심 주변 4개 corner 중 3개 이상이 벽 또는 고정 셀인 경우로 판정한다. 첫 버전에서는 Mini T-Spin을 별도 분류하지 않는다.

T-Spin 기본 점수:

- T-Spin 0 line: 400 × level
- T-Spin Single: 800 × level
- T-Spin Double: 1200 × level
- T-Spin Triple: 1600 × level

Combo는 연속해서 라인을 지운 고정 횟수로 계산한다. 첫 라인 삭제는 combo 0이며, 두 번째 연속 삭제부터 `50 × combo × level` 보너스를 더한다. 라인을 지우지 못한 블록이 한 번 고정되면 combo는 -1로 초기화한다.

Back-to-Back 대상은 Tetris 또는 1줄 이상을 지운 T-Spin이다. 직전 Back-to-Back 대상 이후 일반 Single/Double/Triple이 끼지 않고 다시 대상 clear가 나오면 해당 clear의 기본 점수를 1.5배 적용한다. 0-line T-Spin은 Back-to-Back을 끊지 않지만 보너스 대상은 아니다.

### 레벨과 gravity

- 시작 level은 1이다.
- 누적 10줄을 제거할 때마다 level +1 한다.
- 자동 낙하 간격은 `max(80, 1000 × 0.85^(level - 1))` ms로 계산한다.
- lock delay는 level과 관계없이 500ms를 유지한다.

### 저장

`localStorage`에 최고점수를 저장한다.

- key: `chuntris.bestScore.classic.v1`

## 7. 40줄 타임어택

- 시작 시점부터 elapsed time을 측정한다.
- UI에 `현재 삭제 줄 / 40`, `남은 줄`, `현재 기록`, `최고 기록`을 표시한다.
- 총 40줄을 제거한 순간 게임을 즉시 `completed` 상태로 전환하고 타이머를 멈춘다.
- 완료 후 결과 카드에 기록과 기존 최고기록 대비 차이를 표시한다.
- 게임오버가 발생하면 기록은 저장하지 않는다.
- 타임어택에서는 level을 1로 고정하고 gravity interval을 1000ms로 유지한다. 사용자의 기록 경쟁은 자동 속도 증가가 아니라 직접 입력과 Hard Drop 능력을 중심으로 한다.

저장 key:

- `chuntris.bestTime.sprint40.v1`

시간은 내부적으로 밀리초 정수로 저장하고 화면에서는 `mm:ss.mmm` 형식으로 표시한다.

## 8. 춘봉 캐릭터 리액션

사용자가 제공한 20개 이미지를 `assets/chuntris/`에 웹 최적화해 넣는다. 구현 시 파일명은 원본 이름 대신 역할 중심 이름으로 정규화한다. 예: `idle.webp`, `line-single.webp`, `tetris.webp`, `danger.webp`, `gameover.webp`.

리액션 우선순위는 `gameover/completed > critical danger > danger > special clear/combo > normal clear > idle` 순으로 둔다.

기본 매핑:

- Idle: 기본 춘봉
- 1줄 삭제: 웃는 표정
- 2줄 삭제: 반짝이는 눈
- 3줄 삭제: 하트눈
- 4줄 Tetris: 돈눈 또는 가장 강한 성공 표정
- Combo 3+: 별눈
- Combo 6+: 강한 신난 표정
- 보드 높이 70% 이상: 놀람/느낌표
- 보드 높이 85% 이상: 식은땀·지친 표정
- 반복적인 막힘/회전 실패 상태: 물음표 표정
- Game Over: X눈
- 40줄 완료: 하트/별눈 축하 표정
- Pause 또는 10초 이상 입력 없음: Zzz 표정
- 개인 최고기록 갱신: 돈눈 또는 반짝이 표정

일시적인 normal clear 리액션은 800ms, special clear/combo 리액션은 1200ms 유지한다. 위험 상태와 게임오버/완료 상태는 일시 리액션보다 우선한다.

모든 20개 이미지를 반드시 서로 다른 조건에 억지로 배정하지 않는다. 비슷한 이미지들은 동일 상태의 랜덤 variation으로 활용해 반복감을 줄인다.

## 9. 입력 방식

### 키보드

- `←`, `→`: 좌우 이동
- `↓`: Soft Drop
- `↑` 또는 `X`: 시계방향 회전
- `Z`: 반시계방향 회전
- `Space`: Hard Drop
- `C` 또는 `Shift`: Hold
- `P` 또는 `Esc`: Pause/Resume

게임 중 Space, 방향키 등은 페이지 스크롤을 유발하지 않도록 게임이 활성 상태일 때만 기본 브라우저 동작을 차단한다.

### 모바일

하단 컨트롤:

- 좌 이동
- Soft Drop
- 우 이동
- 반시계 회전
- 시계 회전
- Hold
- Hard Drop

좌우 이동과 Soft Drop은 long press 반복을 지원한다. 회전/Hold/Hard Drop은 한 번의 tap을 한 동작으로 처리한다.

## 10. 렌더링

Canvas는 devicePixelRatio를 반영해 고해상도 화면에서도 블록이 선명하게 보이게 한다.

렌더 순서:

1. 배경 grid
2. 고정된 board cells
3. Ghost piece
4. 현재 active piece
5. line clear flash 또는 완료 효과

라인 삭제 flash는 120ms 이내로 끝내고, `prefers-reduced-motion`에서는 flash 대신 짧은 opacity 변화만 사용한다.

블록 컬러는 표준 7종의 구분성을 유지하면서 팬사이트의 오렌지/브라운 계열 UI와 충돌하지 않게 조정한다. 색상만으로 블록을 구별해야 하는 상황을 줄이기 위해 border/highlight를 함께 사용한다.

## 11. 오디오

외부 음원 파일 없이 Web Audio API로 짧은 효과음을 합성한다.

효과음 종류:

- 이동
- 회전
- 블록 고정
- 라인 삭제
- Tetris
- Level Up
- Game Over
- 40줄 완료

사용자가 한 번도 상호작용하지 않은 상태에서는 브라우저 autoplay 정책에 맞춰 AudioContext를 시작하지 않는다.

설정은 저장한다.

- `chuntris.sound.enabled.v1`
- `chuntris.sound.volume.v1`

기본값은 효과음 ON, 음량 70%다.

## 12. 상태와 데이터 흐름

엔진은 다음 핵심 상태를 소유한다.

- board
- active piece
- hold piece
- next queue
- canHold
- score
- lines
- level
- combo
- backToBack
- mode
- elapsed time
- game status (`idle`, `playing`, `paused`, `gameover`, `completed`)

UI 레이어는 엔진 상태를 읽어 Canvas와 패널을 렌더하고 사용자 입력을 엔진 명령으로 변환한다. UI에서 board 배열을 직접 수정하지 않는다.

## 13. 오류 및 경계 처리

- localStorage 접근이 차단되어도 게임은 계속 플레이 가능해야 한다.
- 이미지 한 장이 로드되지 않아도 게임 로직은 멈추지 않고 idle fallback을 사용한다.
- 창이 background 상태로 들어가면 자동으로 pause 처리해 타임어택 시간이 부정확하게 흘러가지 않게 한다.
- 화면 resize 시 게임 상태는 유지하고 Canvas만 다시 계산한다.
- 모바일 orientation change 후에도 현재 게임을 유지한다.

## 14. 접근성

- Canvas 주변에 현재 모드, 점수, 라인, 상태를 텍스트로도 제공한다.
- 주요 버튼에는 명확한 `aria-label`을 넣는다.
- `prefers-reduced-motion` 사용자는 과도한 flash/scale 효과를 줄인다.
- 키보드만으로 모드 선택, 시작, 일시정지, 재시작이 가능해야 한다.
- 모바일 터치 버튼은 최소 44×44 CSS px의 hit area를 가진다.

## 15. 테스트 전략

### 엔진 단위 회귀 테스트

다음 동작을 순수 JavaScript 테스트로 검증한다.

- 7-bag에서 각 7개 묶음에 7종이 한 번씩 존재
- 좌우/하강 충돌
- SRS wall kick 주요 케이스
- line clear 1/2/3/4줄
- Hold 1회 제한과 다음 블록 고정 후 재활성화
- Ghost landing 위치
- Hard Drop 거리와 점수
- 클래식 Single/Double/Triple/Tetris 점수
- T-Spin 0/1/2/3 line 점수
- combo 증가/초기화와 보너스
- Back-to-Back 시작/유지/종료
- 10줄 단위 level 상승과 gravity 계산
- 40번째 줄 제거 시 completed 상태
- 게임오버 후 타임어택 기록 미저장
- localStorage best score/time 갱신 조건

### UI 회귀 테스트

- `chuntris.html` 존재
- 두 모드 선택 컨트롤 존재
- Canvas 보드 존재
- HOLD/NEXT 영역 존재
- 춘봉 리액션 이미지 영역 존재
- 모바일 입력 버튼 존재
- 메인 내비게이션에 춘트리스 링크 존재
- 효과음/일시정지/새 게임 컨트롤 존재

### 운영 smoke test

Vercel 운영 페이지에서 브라우저 자동화로 다음을 확인한다.

- 페이지 로드
- 클래식 게임 시작
- 키보드 이동/회전/하드드롭
- Pause/Resume
- 40줄 모드 진입
- 캐릭터 이미지 로드
- 모바일 viewport에서 조작 패널 표시

## 16. 팬사이트 통합

기존 `page.js`는 `body[data-page]`와 `data-nav`를 기준으로 현재 메뉴를 활성화한다. 춘트리스 페이지는 `body data-page="chuntris"`와 `data-nav="chuntris"`를 사용한다.

기존 페이지들의 헤더에 춘트리스 링크를 추가할 때 메뉴 폭이 좁아질 수 있으므로 데스크톱과 모바일 내비게이션 모두 회귀 확인한다.

춘트리스 자체 게임 코드는 `page.js`에 넣지 않고 독립 파일로 유지한다.

## 17. 범위에서 제외

첫 버전에는 다음 기능을 넣지 않는다.

- 온라인 멀티플레이
- 서버 기반 글로벌 랭킹
- 로그인/계정 연동
- 아이템전
- 커스텀 키 설정 UI
- DAS/ARR 사용자 설정 UI
- BGM
- PWA 오프라인 설치

이 기능들은 기본 플레이 안정성이 확인된 뒤 별도 기능으로 추가한다.

## 18. 완료 기준

다음 조건을 모두 만족하면 1차 춘트리스 기능을 완료로 본다.

- 팬사이트에서 `chuntris.html`로 직접 플레이 가능
- 클래식 무한모드 정상 동작
- 40줄 타임어택 정상 동작
- 7-bag, Hold, Next 5, Ghost, Hard Drop, 표준 SRS 회전 지원
- PC 키보드와 모바일 터치 모두 지원
- 첨부 춘봉 이미지가 게임 상태에 따라 리액션으로 표시
- 클래식 최고점과 40줄 최고기록 로컬 저장
- 효과음과 음량 설정 저장
- 주요 게임 엔진 테스트 및 UI 회귀 테스트 통과
- 기존 팬사이트 주요 페이지와 내비게이션에 회귀 없음
- Vercel 운영 환경 smoke test 통과
