# 운영자 센터 1.0 설정

운영자 센터: `https://chunbong-fansite.vercel.app/operator.html`

## 소유주

- GitHub: `gkzero0-cmyk`
- GitHub numeric user ID: `322299248`
- 이메일은 저장소에 평문을 넣지 않고 SHA-256 allowlist만 보관합니다.
- GitHub 또는 이메일 중 하나만 인증해도 동일한 소유주 권한을 받습니다.
- 운영자 세션은 최대 1년(365일) 유지됩니다. 보안 탭에서 현재 세션 수 확인 및 모든 기기 로그아웃이 가능합니다.

## GitHub OAuth App

GitHub Settings → Developer settings → OAuth Apps에서 전용 OAuth App을 생성합니다.

- Application name: `CHUNBONG FAN HUB Operator`
- Homepage URL: `https://chunbong-fansite.vercel.app`
- Authorization callback URL: `https://chunbong-fansite.vercel.app/api/operator/github/callback`

Vercel Production 환경변수:

- `OPERATOR_GITHUB_CLIENT_ID`
- `OPERATOR_GITHUB_CLIENT_SECRET`

팬사이트는 `read:user` 최소 scope와 PKCE(S256)를 사용합니다. OAuth 완료 후 서버가 GitHub API에서 받은 numeric user ID가 `322299248`인지 재검증하므로 사용자명 문자열만으로 운영자 권한을 주지 않습니다.

## 이메일 링크 인증 — Firebase Authentication

개인 도메인은 필요하지 않습니다.

1. Firebase 프로젝트를 생성합니다.
2. Authentication → Sign-in method에서 Email/Password provider를 활성화합니다.
3. Email link (passwordless sign-in)를 활성화합니다.
4. Authorized domains에 `chunbong-fansite.vercel.app`을 추가합니다.
5. Web App을 등록하고 Firebase config 값을 확인합니다.

Vercel Production 환경변수:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`

소유주 이메일 평문은 Vercel 환경변수에도 필요하지 않습니다. 서버가 Firebase에서 검증된 이메일을 저장소의 SHA-256 allowlist와 비교합니다.

인증 메일 요청은 등록 여부를 외부에 노출하지 않도록 미등록 이메일이어도 동일한 일반 성공 응답을 반환합니다. 소유주 이메일 발송 요청에는 60초 cooldown이 적용됩니다.

## 저장소와 운영자 세션

기존 Upstash Redis/KV를 재사용합니다.

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- 또는 `KV_REST_API_URL` + `KV_REST_API_TOKEN`

세션 서명 키는 `OPERATOR_SESSION_SECRET`이 있으면 사용하고, 없으면 Redis에 강한 난수 키를 한 번 생성해 저장합니다. 비밀키는 Git에 커밋하지 않습니다.

## 실사용 분석

분석은 Production 배포 후 첫 정상 이벤트가 들어온 시점부터 시작합니다. 과거 미수집 기간을 추정해서 채우지 않습니다.

수집:
- 익명 고유 방문자/세션
- 페이지뷰
- 실제 화면이 보이는 동안의 활동 시간
- 메뉴 클릭
- 타로 시작/결과
- 미니게임 시작/종료
- 모바일/태블릿/PC
- PWA 여부
- 라이트/다크 테마
- 시간대별 이용량

수집하지 않음:
- 분석용 닉네임/이메일/계정
- 분석 데이터의 원본 IP
- 타로 질문 등 사용자가 작성한 개인 내용

원본 IP는 피드백 스팸 방지를 위한 일방향 임시 해시 생성에만 사용하고 저장하지 않습니다. 임시 rate-limit 키는 15초 후 만료됩니다.

기간 선택:
- 오늘
- 최근 7일
- 최근 30일
- 전체 — 분석 수집 시작일부터

## 사용자 피드백

일반 사용자는 로그인 없이 건의·피드백을 보낼 수 있습니다.

- 카테고리
- 닉네임: 선택사항, 비우면 `익명`
- 내용: 필수
- 자동 첨부: 현재 페이지, 기기 유형, 화면 크기, PWA 여부, 테마, 배포 SHA

접수 번호는 `FB-YYYYMMDD-XXXXXX` 형식입니다.

운영자 인증 후 피드백 목록/상세를 확인하고 상태를 다음처럼 관리할 수 있습니다.

`새로 들어옴 → 확인 중 → 반영 예정 → 완료 → 보관`

## 배포 후 검증

1. `/api/content?type=operator-auth-config`에서 Redis storage 상태 확인
2. GitHub/Firebase 설정 후 provider 상태 확인
3. 일반 사용자 피드백 제출 확인
4. 몇 분 이용 후 분석 수치가 들어오는지 확인
5. 인증 없는 `operator-analytics`, `operator-feedback` 요청이 401인지 확인
6. GitHub 또는 이메일 인증 후 대시보드 접근 확인
7. 보안 탭의 로그아웃/모든 기기 로그아웃 확인
8. Vercel Runtime Errors 확인

## 외부 인증 설정 전 동작

GitHub/Firebase 환경변수가 아직 없어도 안전하게 동작합니다.

- 분석/피드백: Redis가 준비되어 있으면 수집 가능
- 운영자 로그인: 설정되지 않은 provider는 UI에서 설정 필요 상태로 표시
- 운영자 API: 유효한 서버 세션 없이는 401
- 브라우저 localStorage 관리자 플래그나 fallback 관리자 비밀번호는 제공하지 않습니다.
