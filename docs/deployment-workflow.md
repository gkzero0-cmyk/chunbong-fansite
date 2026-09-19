# Fan-site deployment workflow

## Goal
Keep Vercel Hobby usage low and avoid production regressions.

## Workflow
1. Create one feature branch for a related batch of changes.
2. Make and verify all code changes on that branch.
3. Run repository regression checks and browser smoke checks before merge.
4. Open one pull request and review its complete diff.
5. Merge once to `main` only after checks pass.
6. Let Vercel create one production deployment from the merged commit.
7. Do not create repeated no-op deployment commits while Vercel is rate-limited.

## Required checks
- Desktop: 1280×720, 1366×768, 1600×900, 1920×1080.
- High resolution: 2560×1440 when layout changes affect scaling.
- Mobile: 390×844.
- Minigames: start, pause, terminal, return flow, rankings, multiplayer where applicable.
- No horizontal overflow.
- No broken local asset paths.
- JavaScript syntax/regression tests pass.

## Production rule
A production-only emergency fix should still be made on a short-lived branch unless the site is unusable. Batch cosmetic changes rather than deploying each small edit separately.
