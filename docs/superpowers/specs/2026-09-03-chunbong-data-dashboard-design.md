# 춘봉 데이터 대시보드 설계

## 목표

팬사이트에 `춘봉 데이터` 메뉴와 전용 페이지를 추가해 춘봉(`chunbongtv`)의 SOOP 방송 활동과 춘봉TV YouTube 공개 활동을 한 화면에서 확인한다. 1차 버전은 별도 유료 API나 데이터베이스 없이 기존 공개 수집기를 재사용하고, 매일 공개 지표 스냅샷을 저장해 추이를 누적한다.

## 사용자 경험

상단 주요 메뉴에 `춘봉 데이터`를 추가하고 홈 포털 카드에도 진입점을 제공한다. 전용 페이지는 다음 순서로 구성한다.

1. **현재 상태**: SOOP LIVE/OFFLINE, 현재 방송 제목/시작 시각(가능할 때), 데이터 갱신 시각.
2. **이번 달 활동**: SOOP 다시보기 기준 방송 횟수와 추정 방송시간, CATCH/클립 수, YouTube 업로드 수.
3. **SOOP 데이터**: 최근 다시보기, 최근 CATCH, 월별 다시보기 횟수/추정 방송시간, 최근 콘텐츠 TOP.
4. **YouTube 데이터**: 최신 영상/Shorts, 공개 페이지에서 읽을 수 있는 조회수 기반 TOP 영상, 최근 30일 업로드 수.
5. **추이**: 일일 스냅샷이 쌓인 이후 7일/30일/월별 공개 지표 변화.
6. **데이터 출처 안내**: SOOP/YouTube 공개 데이터 기반이며, 일부 값은 공개 범위에 따라 비어 있거나 추정치일 수 있음을 표시한다.

## 데이터 소스와 정확도

### SOOP

- 기존 `api/vod.js`, `api/clips.js`, `api/_shared.js`를 재사용한다.
- 라이브 상태는 `live.sooplive.com/afreeca/player_live_api.php` 공개 플레이어 API를 우선 사용하고, 실패 시 `play.sooplive.com/chunbongtv` 공개 페이지를 보조 신호로 사용한다.
- 방송시간은 VOD 목록에서 제공되는 duration 필드가 있으면 합산한다. duration이 제공되지 않는 항목은 방송 횟수에는 포함하되 시간 합계에서는 제외하고 `추정/부분 집계`라고 표시한다.
- 장기 방송시간은 팬사이트가 기능을 도입한 이후 저장한 스냅샷/목록 데이터의 범위에서만 제공한다. 과거 데이터를 임의로 만들지 않는다.

### YouTube

- 기존 `api/youtube.js`의 공개 채널 페이지 파싱을 확장한다.
- API 키가 없어도 최신 일반 영상/Shorts, 제목, 게시 시점, 공개 조회수 텍스트를 표시한다.
- 채널 총 구독자/총 조회수/공개 영상 수는 YouTube 공개 페이지에서 안정적으로 확인되는 경우 표시한다.
- 환경변수 `YOUTUBE_API_KEY`가 설정된 경우에는 YouTube Data API v3의 채널/영상 statistics를 보강 데이터로 사용할 수 있게 인터페이스를 분리하되, 1차 기능은 키 없이도 동작해야 한다.
- YouTube Data API의 `subscriberCount`는 공개 API 특성상 세 자리 유효숫자로 반올림될 수 있으므로 UI에서 정밀 증가량으로 오해하지 않게 한다.

## 서버 구조

### `api/chunbong-data.js`

전용 집계 모듈. 다음 공개 인터페이스를 제공한다.

- `fetchSoopLiveStatus()` → `{ live, title, startedAt, viewerCount, source }`
- `buildMonthlyActivity(vods, clips, youtubeItems, now)` → 월별 카운트/시간 요약
- `buildTopContent(vods, youtubeItems)` → 조회수 파싱이 가능한 항목의 TOP 목록
- `fetchChunbongData()` → 페이지용 전체 payload

모듈은 기존 VOD/CATCH/YouTube fetcher를 직접 호출하며 각각 실패를 격리한다. 한 플랫폼이 실패해도 다른 플랫폼 데이터는 반환한다.

### `api/content.js`

기존 dispatcher에 `type=data`를 추가해 `/api/content?type=data`로 집계 payload를 반환한다.

### 스냅샷

`data/chunbong-data-snapshots.json`에 날짜별 공개 지표를 최대 400일 저장한다. 구조는 다음과 같다.

```json
{
  "version": 1,
  "snapshots": [
    {
      "date": "2026-09-03",
      "capturedAt": "2026-09-03T08:00:00.000Z",
      "soop": { "live": false, "monthlyVodCount": 0, "monthlyVodMinutes": null, "catchCount": 0 },
      "youtube": { "subscriberCount": null, "viewCount": null, "videoCount": null, "recentUploadCount": 0 }
    }
  ]
}
```

GitHub Actions의 일일 workflow가 Node 스크립트를 실행해 같은 날짜의 스냅샷을 upsert한다. 값이 실제로 변했을 때만 JSON을 commit한다. 이 commit은 Vercel Git 연동으로 하루 최대 1회의 자연스러운 배포를 발생시킨다.

## 프론트 구조

### `data.html`

기존 페이지 헤더/푸터/브랜드 구조를 그대로 사용하고 `body data-page="data"`를 설정한다. 주요 DOM 영역:

- `#data-status`
- `#data-summary-grid`
- `#data-soop-monthly`
- `#data-youtube-monthly`
- `#data-top-content`
- `#data-recent-content`
- `#data-trend-chart`
- `#data-updated`

### `data.js`

`/api/content?type=data`를 로드해 숫자 포맷, 기간 필터, 카드/막대 그래프 렌더링을 담당한다. 외부 차트 라이브러리는 추가하지 않고 CSS grid/bar로 구현한다.

오류 시 플랫폼별로 독립적인 안내를 표시하고 페이지 전체를 실패시키지 않는다.

### `styles.css`

기존 디자인 언어를 유지한 데이터 전용 KPI 카드, 플랫폼 카드, bar chart, TOP 리스트 스타일을 추가한다. 모바일에서는 1열, 태블릿 2열, 데스크톱 4열 KPI 구조를 사용한다.

## 메뉴 반영

모든 주요 HTML 페이지의 `.main-nav`에 `data-nav="data" href="data.html">춘봉 데이터</a>`를 추가한다. 홈 `portal-grid`에는 08 / DATA 카드도 추가한다. 기존 메뉴 순서는 유지하고 `유튜브` 다음 또는 `TAROT` 다음에 데이터 메뉴를 배치한다.

## 캐싱

- 집계 API 응답: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
- payload에 `capturedAt`을 항상 포함한다.
- 프론트 자동 새로고침은 5분 간격이며 document hidden 상태에서는 중단한다.

## 보안 및 운영 제약

- API key, 쿠키, 로그인 세션을 저장소에 커밋하지 않는다.
- 공개 데이터만 사용한다.
- SOOP/YouTube 한쪽 upstream 변경이 전체 팬사이트 장애로 이어지지 않게 한다.
- 기존 공지, 일정, CATCH, 타로 동작은 변경하지 않는다.
- 외부 차트/analytics 라이브러리를 추가하지 않는다.

## 테스트

1. `tests/chunbong-data-api-regression.mjs`: 집계 함수, duration/view 파싱, 부분 실패 격리.
2. `tests/chunbong-data-ui-regression.mjs`: 메뉴, DOM id, API endpoint, source copy.
3. `tests/chunbong-data-snapshot-regression.mjs`: 날짜 upsert, 최대 400개 유지, null 안전성.
4. 기존 `tests/*.mjs` 전체 실행.
5. `node --check`로 새/수정 JS 전체 문법 검사.
6. production smoke에서 `/data.html`, `/api/content?type=data` HTTP 200과 핵심 payload shape 검증.

## 완료 기준

- 팬사이트 모든 페이지에서 `춘봉 데이터` 메뉴가 보인다.
- `data.html`이 SOOP와 YouTube 공개 데이터를 동시에 렌더링한다.
- 한 플랫폼 수집 실패 시 다른 플랫폼 데이터가 유지된다.
- 월별/최근/TOP/추이 영역이 빈 데이터에서도 깨지지 않는다.
- 일일 스냅샷 workflow가 중복 날짜를 만들지 않는다.
- 전체 기존 회귀 테스트가 통과한다.
- Vercel production에서 데이터 페이지/API가 200으로 응답한다.
