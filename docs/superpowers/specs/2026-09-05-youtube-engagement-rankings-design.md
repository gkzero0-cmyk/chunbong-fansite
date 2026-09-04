# YouTube Engagement Rankings Design

## Goal

Extend the existing fan-site data dashboard so SOOP daily history shows only the latest 10 days, three unwanted SOOP KPI cards are removed, and YouTube “반응이 큰 콘텐츠” can be explored by time range and engagement metric using complete public-channel statistics rather than only the recent-content feed.

## Scope

### SOOP
- The daily tab uses only the latest 10 dated rows for daily charts and the daily detail table.
- Monthly and calendar history remain unchanged and continue to use the full available history.
- Remove these cards from the UI: `이번 달 별풍선`, `별풍선 시급`, `이번 달 채금`.
- Keep their backend values if they are still useful to cache/update logic; this change is a presentation change, not destructive data removal.

### YouTube engagement rankings
Replace the single `YouTube TOP` presentation with two controls:
- Range: `전체`, `이번 달`, `최근 3달`
- Metric: `조회수`, `댓글`

This yields six rankings:
1. 전체 기간 · 조회수 높은 순
2. 전체 기간 · 댓글 많은 순
3. 이번 달 · 조회수 높은 순
4. 이번 달 · 댓글 많은 순
5. 최근 3달 · 조회수 높은 순
6. 최근 3달 · 댓글 많은 순

`이번 달` means the current Korea-calendar month. `최근 3달` means the current month plus the previous two calendar months, e.g. 2026-09 means 2026-07-01 through now.

Each ranking displays up to five public videos/Shorts. A content item is eligible for view ranking only when `viewCount` is finite. It is eligible for comment ranking only when `commentCount` is finite. Missing/disabled comment counts are not estimated.

## Data architecture

The current `api/youtube.js` recent feed remains responsible for recent uploads and Shorts. A new engagement-cache path handles complete-channel rankings so page requests stay fast.

Create `lib/youtube-engagement.js` for pure normalization, date-window and ranking logic. Create `scripts/update-youtube-engagement-cache.mjs` to refresh a persistent `data/youtube-engagement-cache.json` from YouTube public pages. The updater should:
- discover all public Videos and Shorts through YouTube channel browse continuations;
- deduplicate by video ID;
- fetch each watch page with bounded concurrency;
- extract exact/available view count, comment count and publication date;
- preserve the last normal item values when a refresh cannot retrieve one metric;
- write a versioned cache atomically only when it has usable content.

The existing daily snapshot workflow refreshes this cache before capturing the production data snapshot. If YouTube is temporarily unavailable, the last committed normal cache remains in use.

`lib/chunbong-data.js` reads the cache and returns a compact `youtube.engagement` object containing six precomputed top-five lists and cache metadata. It should not send the whole full-channel item cache to the browser.

## UI

`data.js` keeps `#data-youtube-top` as the host and renders range/metric toggle controls plus one ranking panel. Toggle interaction is client-side over the six precomputed lists, so no additional network request is required.

Each row shows rank, title, publication date/type, and the selected metric value. The existing visual language of the data dashboard is preserved. Add focused CSS only for the new toggle controls and comment-count label.

## Error and fallback behavior

- If the engagement cache is absent/empty, show a clear empty state in the rankings area; the rest of YouTube data continues to render.
- If a refresh fails, do not overwrite a healthy previous cache with an empty/broken cache.
- No invented counts or inferred comments.
- Recent-upload logic remains independent from engagement rankings.

## Verification

Use TDD for:
- latest-10-day SOOP daily rendering;
- removal of the three SOOP KPI labels;
- calendar-month window calculations;
- all/current-month/three-month ranking selection;
- comment-ranking exclusion when comments are unavailable;
- deduplication and fallback cache merge;
- compact API payload shape;
- UI control/rendering tokens.

Run `node --check` on changed JavaScript, all `tests/*.mjs`, GitHub Site regression, Vercel deployment, Production data smoke, and a headless Chrome production render check before completion.