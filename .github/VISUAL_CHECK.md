# Production visual check

The fan site uses GitHub Actions + Playwright for routine visual validation so normal UI checks do not depend on Firecrawl screenshot credits.

## When it runs

- Automatically after a push to `main` that changes HTML, JS, CSS, API files, assets, or the visual-check workflow itself.
- Manually through **Actions → Visual production check → Run workflow**.
- Manual runs can override the target URL and comma-separated page list.

For normal code pushes, the workflow waits for the Vercel commit status to become successful before checking Production. If Vercel reports a failed deployment, the visual check is skipped rather than validating an older Production build.

## What it checks

Each selected page is inspected at:

- Desktop: 1440 × 1000
- Mobile: 390 × 844

Blocking checks:

- Page navigation failure
- Horizontal page overflow
- Broken rendered images
- Uncaught page JavaScript errors
- HTTP errors for page documents, scripts, stylesheets, images, fonts
- History API errors when the history page requests `/api/history-sheet`

Warnings:

- Console errors
- Non-blocking API HTTP errors
- Visible mobile interactive targets smaller than 40px

## Cost controls

- Only changed/relevant pages are selected, up to 4 pages per run.
- Asset changes are mapped to the most likely page instead of triggering a full-site capture.
- Chromium and npm downloads are cached.
- Screenshots use JPEG quality 68.
- Artifacts are retained for 7 days.
- There is no scheduled/nightly run.
- The workflow does not call Firecrawl.
- `.github/`-only changes are already ignored by the Vercel build ignore logic, so maintaining this checker does not consume an unnecessary Vercel Production build.

## Artifacts

Each run uploads:

- Desktop and mobile screenshots
- `report.json` with machine-readable diagnostics
- `summary.md` with the run summary

The same summary is also added to the GitHub Actions job summary.
