# 춘봉 데이터 SOOP 상세 분석 디자인

## 목표

`춘봉 데이터`를 SOOP과 YouTube로 완전히 분리하고, SOOP 화면을 일별·월별·캘린더·그래프 중심의 상세 분석 대시보드로 확장한다. 팬사이트가 직접 수집한 공개 시청자 샘플과 채널 공개 지표를 이용해 방송시간, 누적 방송시간, 평균/최대 시청자, 애청자·팬클럽 증감, 방송 카테고리별 통계를 제공한다.

## 핵심 원칙

- 공개 데이터만 사용한다. 로그인이나 스트리머 전용 SOOP 통계 화면에는 의존하지 않는다.
- 과거에 없는 평균/최대 시청자, 애청자 증감, 팬클럽 증감은 추정하지 않는다.
- 시청자 수는 약 5분 간격의 팬사이트 측정값으로 계산하며 UI에 `팬사이트 측정` 출처를 표시한다.
- 애청자·팬클럽 카운트가 공개 응답에서 안정적으로 확보되지 않으면 `측정 불가`로 표시하고, 확보되는 시점부터 증감을 계산한다.
- SOOP과 YouTube 데이터는 별도 탭과 별도 렌더링 흐름으로 나눈다.
- 실시간 수집 때문에 Vercel Hobby 배포 한도를 소모하지 않도록 5분 샘플은 `data/soop-telemetry` 브랜치에만 기록하고 해당 브랜치의 Vercel Git 배포는 비활성화한다.
- 방송 종료 시 영구 보존할 세션 요약만 `main`의 `data/soop-sessions.json`에 추가한다.

## 데이터 수집 구조

### 1. SOOP 공개 상태 수집

기존 `lib/chunbong-data.js`의 LIVE 파서를 확장해 다음 값을 best-effort로 정규화한다.

- `live`: 방송 여부
- `title`: 방송 제목
- `startedAt`: 방송 시작 시각
- `viewerCount`: 현재 시청자 수
- `categoryId`: 카테고리 식별자
- `categoryName`: 카테고리 이름
- `followerCount`: 공개 애청자/팔로워 수
- `fanclubCount`: 공개 팬클럽 수가 확인되는 경우의 값

필드명은 SOOP 응답 변화에 대응하도록 후보 키 배열과 재귀 탐색을 사용한다. 값이 없으면 `null`을 유지한다.

### 2. 5분 텔레메트리

`.github/workflows/soop-telemetry.yml`을 `*/5 * * * *`로 실행한다. 워크플로는 `main`의 수집기 코드를 실행하되 현재 상태 파일은 `data/soop-telemetry` 브랜치에서 읽고 다시 그 브랜치에 저장한다.

텔레메트리 상태 구조:

```json
{
  "version": 1,
  "session": {
    "active": true,
    "sessionId": "2026-09-03T10:00:00.000Z",
    "startedAt": "2026-09-03T10:00:00.000Z",
    "title": "방송 제목",
    "samples": [
      {
        "capturedAt": "2026-09-03T10:05:00.000Z",
        "viewerCount": 42,
        "categoryId": "...",
        "categoryName": "버추얼",
        "followerCount": 1234,
        "fanclubCount": null
      }
    ]
  },
  "lastProfile": {
    "capturedAt": "...",
    "followerCount": 1234,
    "fanclubCount": null
  }
}
```

샘플은 한 세션 동안만 유지한다. 방송이 끝나면 세션 요약을 생성하고 텔레메트리의 활성 세션을 비운다.

### 3. 방송 세션 영구 데이터

`data/soop-sessions.json`에 방송 1회당 다음 구조를 저장한다.

```json
{
  "id": "2026-09-03T10:00:00.000Z",
  "startedAt": "...",
  "endedAt": "...",
  "date": "2026-09-03",
  "durationMinutes": 245,
  "averageViewers": 44,
  "maxViewers": 71,
  "viewerSampleCount": 48,
  "followerStart": 1200,
  "followerEnd": 1206,
  "followerDelta": 6,
  "fanclubStart": null,
  "fanclubEnd": null,
  "fanclubDelta": null,
  "title": "...",
  "categories": [
    {
      "name": "버추얼",
      "minutes": 180,
      "sampleCount": 36,
      "averageViewers": 46,
      "maxViewers": 71
    }
  ],
  "measurement": "fan-site-sampled-5m"
}
```

평균 시청자는 유효한 `viewerCount` 샘플의 산술 평균, 최대 시청자는 최대값으로 계산한다. 카테고리별 시간은 연속 샘플 간 간격을 최대 10분으로 제한해 합산해 비정상적으로 긴 수집 공백이 전체 시간을 왜곡하지 않게 한다.

### 4. 일별·월별 집계

새 `lib/soop-analytics.js`는 순수 함수로 세션 배열과 채널 스냅샷을 집계한다.

일별 데이터:

- 방송 횟수
- 방송시간
- 누적 방송시간
- 평균 시청자
- 최대 시청자
- 애청자 증감
- 팬클럽 증감
- 카테고리별 방송시간/평균 시청자/최대 시청자

월별 데이터:

- 방송 일수
- 방송 횟수
- 총 방송시간
- 회당 평균 방송시간
- 월 평균 시청자
- 월 최대 시청자
- 월 애청자 증감
- 월 팬클럽 증감
- 카테고리별 총 방송시간, 방송 횟수, 평균/최대 시청자, 방송시간 비중

누적 방송시간은 저장된 실측 세션의 합계로 계산한다. VOD에서 과거 방송시간을 복원한 값이 있으면 별도 `공개 기록` 데이터로 표시할 수 있지만 실측 누적과 섞어 정확한 값처럼 보여주지 않는다.

## UI 구조

`data.html` 상단에 큰 플랫폼 탭을 둔다.

- `SOOP 데이터`
- `YouTube 데이터`

### SOOP 탭

1. **현재 상태 / 핵심 KPI**
   - LIVE/OFFLINE
   - 현재 시청자
   - 오늘 방송시간
   - 이번 달 방송시간
   - 실측 누적 방송시간
   - 이번 달 평균 시청자
   - 이번 달 최대 시청자
   - 애청자·팬클럽 현재값과 증감

2. **보기 모드**
   - `일별`
   - `월별`
   - `캘린더`

3. **일별 그래프**
   - 방송시간
   - 평균/최대 시청자
   - 애청자/팬클럽 증감

4. **월별 그래프**
   - 월 총 방송시간
   - 월 평균/최대 시청자
   - 월 애청자/팬클럽 증감

5. **캘린더**
   - 월 전환 버튼
   - 방송일 강조
   - 날짜 셀에 방송시간과 최대 시청자 표시
   - 날짜 클릭 시 상세 패널: 방송 횟수, 총 방송시간, 평균/최대 시청자, 증감, 카테고리, 해당 날짜 방송 세션

6. **카테고리 분석**
   - 카테고리별 방송시간 비중
   - 방송 횟수
   - 평균 시청자
   - 최대 시청자

그래프는 외부 CDN 없이 SVG로 렌더링한다. 모바일에서는 가로 스크롤 또는 축약 라벨을 사용한다.

### YouTube 탭

현재 YouTube 대시보드의 채널 통계, 최근 영상, Shorts, TOP 콘텐츠, 구독자/조회수 추이를 YouTube 탭 안으로 이동한다. SOOP 데이터와 DOM/렌더링 함수도 분리한다.

## API 응답

기존 `/api/content?type=data`를 유지해 서버리스 함수 수를 늘리지 않는다. 응답을 다음처럼 확장한다.

```json
{
  "soop": {
    "live": {},
    "overview": {},
    "daily": [],
    "monthly": [],
    "calendar": [],
    "categories": [],
    "recentSessions": [],
    "measurement": {
      "viewer": "fan-site-sampled-5m",
      "follower": "public-snapshot",
      "fanclub": "public-snapshot-or-unavailable"
    }
  },
  "youtube": {},
  "errors": [],
  "fallback": false
}
```

텔레메트리 브랜치에서 읽는 실시간 상태가 실패해도 저장된 세션/YouTube 데이터는 계속 반환한다.

## 자동화와 배포

- `soop-telemetry.yml`: 5분마다 실행, `data/soop-telemetry`에 샘플 상태 저장.
- 방송 종료 감지 시 `data/soop-sessions.json`을 `main`에 한 번 커밋.
- 기존 일일 snapshot workflow는 애청자·팬클럽 채널 스냅샷 필드를 추가한다.
- `vercel.json`의 `git.deploymentEnabled`에서 `data/soop-telemetry` 브랜치를 `false`로 설정해 텔레메트리 커밋이 Preview 배포를 만들지 않게 한다.

## 데이터 품질 표시

UI에 지표별 출처 배지를 표시한다.

- `팬사이트 측정`: 5분 샘플 기반 시청자/세션 통계
- `공개 스냅샷`: SOOP 공개 채널 카운트 기반 애청자·팬클럽
- `공개 기록`: 과거 VOD에서 확인 가능한 날짜/방송시간
- `측정 불가`: 공개 값이 없거나 수집 시작 전

과거 시청자·증감 데이터를 임의 보간하지 않는다.

## 오류 처리

- SOOP LIVE 요청 실패: 최신 영구 세션과 마지막 스냅샷을 표시하고 상태에 `일시적으로 실시간 측정 불가` 표시.
- 텔레메트리 상태 읽기 실패: 실시간 세션만 비우고 영구 통계는 정상 제공.
- follower/fanclub 필드 누락: 해당 값만 `null`, 다른 통계 정상 제공.
- 5분 샘플 지연: 간격을 최대 10분으로 clamp해 카테고리/방송시간 계산 왜곡 방지.
- 중복 방송 종료 처리: 세션 ID 기반 upsert로 같은 세션이 두 번 저장되지 않게 한다.

## 테스트

- `tests/soop-analytics-regression.mjs`: 평균/최대 시청자, 방송시간, follower/fanclub delta, 카테고리 집계, 일별/월별 집계.
- `tests/soop-telemetry-regression.mjs`: offline→live→live→offline 상태 전이, 세션 생성, 중복 방지.
- `tests/chunbong-data-api-regression.mjs`: 확장된 `soop.overview/daily/monthly/categories/recentSessions` 계약.
- `tests/chunbong-data-ui-regression.mjs`: SOOP/YouTube 탭, 일별/월별/캘린더 DOM, SVG 그래프/날짜 상세 패널.
- 전체 `tests/*.mjs`, 모든 JS `node --check`.
- Vercel Preview에서 `data.html`과 `/api/content?type=data` smoke.
- Production에서 SOOP/YouTube 탭, API, 첫 텔레메트리 workflow dry-run을 확인한다.
