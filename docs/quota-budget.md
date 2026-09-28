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
