# 팬사이트 운영 안정화 가이드

이 문서는 외부 서비스 제한, Redis 장애, Vercel 배포 제한, 수집기 장애가 발생했을 때 운영자 센터에서 확인하고 복구하는 절차를 정리합니다.

## 1. 먼저 확인할 화면

운영자 센터의 **시스템 → 외부 사용량 보호**에서 다음을 확인합니다.

- 현재 모드: 정상 / 절약 / 제한
- Redis / KV 상태
- Vercel 배포 상태
- SOOP / YouTube / Notion / Trackify 상태
- 최근 24시간 제한 이벤트
- 최근 30일 날짜별 제한 건수
- 최근 30일 원인별 누적
- 복구 데이터 모드 상태

## 2. Redis 제한이 발생한 경우

Redis circuit 또는 service_limit가 표시되면 비핵심 분석 전송은 자동으로 감속됩니다.

- 일반 분석 장애: 약 6시간 backoff
- Redis service limit / circuit: 약 12시간 backoff
- 랭킹, 외부 캐시, push 등은 각 기능의 fallback을 우선 사용합니다.
- Redis가 정상화되면 circuit 만료 후 정상 요청으로 복귀합니다.

운영자가 Redis를 반복 새로고침하거나 강제로 호출할 필요는 없습니다.

## 3. Vercel build-rate-limit이 발생한 경우

운영자 센터에서 Vercel 배포 제한이 표시되면 추가 deploy hook을 반복 호출하지 않습니다.

- 이미 pending인 배포가 있으면 중복 배포를 만들지 않습니다.
- 데이터-only / 테스트 / 문서 변경은 Vercel build를 건너뜁니다.
- 제한이 풀린 뒤 정상 상태가 확인되면 Vercel 회복 이벤트가 기록됩니다.

Production SHA가 GitHub main보다 뒤에 있어도 사이트 자체가 정상이라면 제한 해제 뒤 다음 정상 배포를 기다리는 것이 안전합니다.

## 4. last-known-good 복구 모드

복구 모드는 원본 파일을 덮어쓰지 않습니다. 읽기 소스만 검증된 복구본으로 전환합니다.

### 전환

1. 운영자 센터 → 시스템 → 외부 사용량 보호로 이동합니다.
2. last-known-good 사용 버튼을 누릅니다.
3. 확인 창에서 승인합니다.
4. 상태가 last-known-good 사용 중으로 바뀌는지 확인합니다.
5. 공개 data 응답에는 recoveryMode: last-known-good가 표시됩니다.

현재 복구 모드는 YouTube engagement와 SOOP follower history를 우선 복구합니다.

### 원복

1. 같은 위치에서 현재 데이터로 복귀를 누릅니다.
2. 상태가 현재 데이터 사용 중으로 바뀌는지 확인합니다.

복구본이 없거나 무결성 검증을 통과하지 못한 경우 버튼은 비활성화됩니다.

## 5. 복구본 생성 기준

매일 핵심 데이터가 정상일 때만 새 복구본을 만듭니다.

검증 항목:

- JSON 파싱 성공
- 필수 배열/객체가 비어 있지 않음
- 데이터가 90일 이상 오래되지 않음
- row 수 기록
- byte 크기 기록
- SHA-256 checksum 기록
- 최신 데이터 시각 기록

검증 실패 시 기존 last-known-good를 덮어쓰지 않습니다.

## 6. 외부 수집기 장애

SOOP, YouTube, Trackify 등 외부 서비스가 일시적으로 실패하면 가능한 경우 기존 정상 캐시를 유지합니다.

- 외부 JSON: 최근 정상 데이터 최대 6시간 stale fallback
- YouTube: 기존 engagement cache 보존
- Trackify: 기존 stats / sessions 보존
- 자동 수집기: checkpoint 이후 증분 범위만 탐색

외부 서비스 복구 전까지 전체 과거 데이터를 반복 재수집하지 않습니다.

## 7. 공개 경로 부하 점검

GitHub Actions의 Public load smoke는 수동 실행 전용입니다.

기본값:

- 동시 요청 3개
- 2라운드
- 최대 동시 요청 5개
- p95 5초 초과 또는 HTTP 오류가 있으면 실패

팬사이트 기본 점검 경로:

- /
- /api/version
- /api/content?type=data
- /api/content?type=chunbong-content-home

이 테스트는 평소 자동 실행하지 않습니다.

### 기준값 · 2026-09-29 KST

기본 동시 요청 3개 × 2라운드로 측정한 첫 기준값입니다.

- / : p95 193ms · 오류 0
- /api/version : p95 58ms · 오류 0
- /api/content?type=data : p95 55ms · 오류 0
- /api/content?type=chunbong-content-home : p95 292ms · 오류 0

향후 같은 테스트에서 p95가 크게 상승하거나 오류가 발생하면 최근 배포·외부 API·Redis 상태를 함께 확인합니다.

## 8. 문제 발생 시 판단 순서

1. 공개 사이트가 정상 열리는지 확인
2. 운영자 센터의 Quota 상태 확인
3. 최근 24시간 이벤트 확인
4. Redis circuit / Vercel rate-limit 여부 확인
5. 외부 데이터만 이상하면 stale/cache가 유지되는지 확인
6. 데이터가 명백히 깨졌을 때만 last-known-good 사용
7. 장애가 끝나면 현재 데이터로 복귀
8. 30일 원인별 누적에서 반복되는 병목이 있는지 확인

## 9. 하지 않아야 할 것

- 제한 중 deploy hook 반복 호출
- Redis 제한 중 운영자 센터 강제 새로고침 반복
- 외부 provider 장애 중 전체 과거 데이터 강제 재수집
- 복구본 파일을 수동으로 현재 데이터 위에 덮어쓰기
- 원인을 확인하지 않은 채 cache를 전부 제거하기

현재 구조는 제한 상황에서 자동으로 요청량을 줄이고 last-good 데이터를 유지하는 방향으로 설계되어 있습니다.
