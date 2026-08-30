# 춘봉 팬사이트

정적 HTML/CSS/JS + Vercel Functions(`api/`) 구조입니다.

## Vercel 배포

- Build Command: 비움 (None)
- Output Directory: 비움
- Install Command: 비움
- Framework Preset: Other

GitHub 저장소를 Vercel 프로젝트에 연결하면 `main` 브랜치 push마다 자동 배포됩니다.

## 로컬 회귀 테스트

```bash
for f in tests/*.mjs; do node "$f"; done
```

Vercel Git deployment enabled
