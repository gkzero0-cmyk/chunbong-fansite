# Crew News Automation

독립 크루 소식 자동화 API입니다. 팬사이트와 배포/캐시/서버리스 함수를 분리하기 위한 전용 Vercel Root Directory입니다.

## Endpoints
- `/api/status` — 배포/정책 상태
- `/api/crew-news` — SOOP 게시글/VOD 수집
- `/api/crew-news-batch` — 크루별 대표 소식 판정
- `/api/image` — SOOP 이미지 프록시

## Vercel
이 저장소를 별도 Vercel Project에 연결하고 Root Directory를 `crew-automation`으로 지정합니다.
