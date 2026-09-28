# External quota and data budget guardrails

This fan site is designed to degrade gracefully when external free-tier limits are reached.

## Redis separation

Existing Redis variables remain the fallback, so no migration is required for this change.

Optional dedicated stores are supported:

- `OPERATOR_REDIS_REST_URL` / `OPERATOR_REDIS_REST_TOKEN`
- `RANKING_REDIS_REST_URL` / `RANKING_REDIS_REST_TOKEN`
- `CONTENT_REDIS_REST_URL` / `CONTENT_REDIS_REST_TOKEN`
- `MULTIPLAYER_REDIS_REST_URL` / `MULTIPLAYER_REDIS_REST_TOKEN`
- `PUSH_REDIS_REST_URL` / `PUSH_REDIS_REST_TOKEN`

Do not point a feature at a new empty Redis until any data that must be preserved has been migrated. If the dedicated variables are absent, the existing `KV_REST_API_*` / `UPSTASH_REDIS_REST_*` configuration is used.

## Redis protections

- Operator Redis opens a 15-minute in-process circuit after a quota/rate limit.
- Ranking, multiplayer, push, and content archive Redis clients fail fast for 5-10 minutes after quota-like failures.
- Operator pipelines no longer fan out into individual commands after a failed pipeline.
- Content archive item reads use chunked MGET instead of one GET per item.
- Operator feedback/session/security/history lists use batched reads.
- Operator analytics dashboard reads use chunked pipelines and a 60-second in-memory result cache.
- Operator dashboard automatic polling is 5 minutes and pauses in a hidden tab.
- Analytics data retention is bounded to 180 days; cleanup runs infrequently.

## Analytics write budget

- Page views remain unsampled.
- Navigation timing and Web Vitals are sampled for 20% of visitors using a stable visitor-based sample.
- Active-time flushes are reduced from 2 minutes to 5 minutes.
- The daily analytics date index is updated on page views instead of every analytics flush.

## External source caches

- Public single-station crew news: CDN 10 minutes, stale 1 hour.
- Complete unauthenticated crew-news batches: CDN 1 hour, stale 6 hours.
- Authenticated, forced-refresh, or incomplete crew-news responses are never publicly cached.
- `refresh=1` bypasses crew-news caching when an intentional refresh is required.
- Version checks: CDN 5 minutes, stale 30 minutes.
- History content auto-linking uses `chunbong-content-index`, a compact endpoint cached at the CDN for 30 minutes, instead of downloading the full content archive list.

## Visual checks

Routine screenshots use the GitHub Actions + Playwright production check. Firecrawl should be reserved for cases where the Playwright artifact cannot answer the visual question.

The visual workflow:
- checks at most 4 relevant pages per run,
- captures desktop and mobile only,
- uses compressed JPEG screenshots,
- caches Playwright/npm downloads,
- keeps artifacts for 7 days,
- has no nightly schedule.


## Adaptive budget and last-good fallback

The browser installs a small same-origin GET coordinator from `site-shell.js`.

For selected public endpoints it:
- merges identical in-flight requests,
- reuses a short in-memory response window,
- stores a bounded last-good JSON snapshot in localStorage,
- falls back to that snapshot on network/5xx failures,
- prefers a last-good ranking snapshot over an `unavailable:true` response when one is still fresh.

Covered endpoints include version, history-sheet, crew-news, crew-news-batch, compact content index, and public ranking reads. Forced refresh requests (`refresh=1`) bypass this layer.

Server-side warm-instance snapshots are also kept for:
- public crew-news results (up to 6 hours),
- ranking reads (up to 24 hours).

These are opportunistic fallbacks only; CDN caching remains the primary shared cache.

## Operator resource budget view

The operator system panel exposes the protection state:
- saving vs limit mode,
- Redis circuit state,
- analytics sample rate,
- analytics retention window,
- dashboard polling cadence,
- request dedupe / last-good / crew cache / ranking fallback / Playwright checks,
- whether optional feature-specific Redis stores are configured.

This view is intentionally descriptive. It does not invent Vercel or Redis quota percentages when the provider does not expose exact usage to the runtime.


## Incremental automatic collection

Official archive collection uses persistent checkpoints instead of repeatedly walking the same recent pages.

SOOP:
- VOD, Catch, Clip, and station posts each remember the newest successful item ID.
- Incremental scans still fetch page 1 to detect new items.
- As soon as the previous checkpoint ID appears, deeper paging stops.
- A forced/manual full sync ignores checkpoints.

YouTube:
- Videos and Shorts keep separate newest-item checkpoints.
- The first tab page is always checked for new uploads.
- Continuation paging stops when the last-seen video ID is found.
- Full sync remains available for explicit repair/backfill work.

Notion:
1. The public page request uses the previous ETag / Last-Modified when available.
2. HTTP 304 skips Notion record-map and media work completely.
3. If HTTP 200 is returned, a lightweight root record-map fingerprint is compared.
4. An unchanged fingerprint reuses the existing structured guide.
5. Only changed documents run the recursive page scan, signed-file URL requests, image probes, and permanent media processing.

The first run after this optimization seeds checkpoints/fingerprints. Savings become largest from the following scheduled run onward.

The operator content center shows:
- checkpoint early-stop count,
- unchanged Notion skip count,
- full vs incremental-checkpoint scan mode.
