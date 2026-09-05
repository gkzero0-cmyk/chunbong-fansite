# SOOP Live / History / Category Dashboard Design

Date: 2026-09-06

## Goal

Make the SOOP dashboard accurate and immediately useful for live status, weekly/daily history, monthly history, favorite/follower growth, and category analysis without reintroducing removed external-source branding or guessed values.

## Scope

This change affects only the SOOP data dashboard and its supporting collection/aggregation paths. YouTube behavior is unchanged.

Requested outcomes:

1. Remove the `이번 달 후원자` KPI from the SOOP overview.
2. Fix false `OFFLINE` while Chunbong is actually live.
3. Let daily history be browsed in rolling 7-day buckets anchored to today.
4. Let monthly history be browsed by every month that has data.
5. Backfill historical `애청자 · 즐겨찾기` values where a concrete public value can be verified.
6. Show category count, share %, and airtime for the current month.
7. Add a recent-three-calendar-month category analysis.
8. Keep current-month/category information fresh while a stream is in progress.

## Definitions

- `애청자 · 즐겨찾기` maps to the SOOP/Trackify favorite/follower count used by the current `followerCount` field.
- `오늘 기준 일주일` means rolling calendar buckets in KST:
  - current bucket: today through 6 days ago,
  - previous bucket: 7 through 13 days ago,
  - and so on until the earliest available daily record.
- `최근 3개월` means the current KST calendar month plus the previous two calendar months. Example: 2026-09-06 -> 2026-07-01 through 2026-09-06.
- Historical values are never interpolated. If no public value is verifiable for a date, that date remains unknown.

## Architecture

### 1. Live-state resolver

Replace the current single HTML-text heuristic with a resolver that returns one normalized live state.

Priority:

1. SOOP structured current-broadcast/channel data that explicitly reports an active broadcast number/state.
2. Trackify current streamer data when it explicitly indicates a currently active broadcast.
3. Existing SOOP player HTML parser only as a last fallback.

Rules:

- An explicit positive live signal wins over a stale/offline fallback signal.
- `OFFLINE` is shown only when at least one authoritative source explicitly reports offline and no source explicitly reports live.
- If sources fail or disagree without a positive signal, state becomes `확인 중`, not `OFFLINE`.
- When live, normalize `startedAt`, title, viewer count, category id/name, and broadcast id when available.

This normalized state continues to feed the five-minute telemetry workflow so the displayed live state and collected session state follow the same rule.

### 2. Historical favorite/follower series

Add a persistent public history file dedicated to follower/favorite observations rather than mixing internet backfill into completed stream sessions.

Proposed shape:

```json
{
  "version": 1,
  "points": [
    {
      "date": "2026-08-15",
      "followerCount": 29610,
      "source": "trackify",
      "capturedAt": "2026-09-06T00:00:00Z"
    }
  ]
}
```

Collection rules:

- Prefer Trackify historical/day/month streamer data when it exposes an exact favorite/follower value for a date.
- Existing fan-site snapshots remain valid and take precedence for the same date when they were captured directly on that date.
- Public internet fallback is allowed only when the page/search result contains a concrete date-associated numeric favorite/follower value.
- Store source metadata internally for audit/debugging, but do not display source badges in the dashboard.
- Merge by date, preserving the highest-confidence exact observation. No interpolation or synthetic fill.

The analytics layer consumes the merged series to calculate daily and monthly follower deltas.

### 3. Daily rolling-week model

Keep the complete `soop.daily` dataset in the server/API. Do not truncate raw history to ten records.

Add a client-side period model:

```text
week[0] = today ... today-6d
week[1] = today-7d ... today-13d
...
```

For the selected bucket, filter daily rows to the inclusive KST date range and render:

- daily airtime,
- cumulative airtime within the selected view only when a cumulative chart is shown,
- average viewers,
- max viewers,
- favorite/follower delta,
- fanclub delta,
- daily detail rows.

The default selected bucket is the current seven days. Empty days may appear as gaps/zero-airtime only where appropriate; unknown follower deltas remain unknown rather than `0`.

### 4. Monthly selector

Generate month chips from `soop.monthlyStats` and available session/calendar records rather than hard-coding six months.

Default selection:

- current KST month if present,
- otherwise newest available month.

When a month is selected:

- monthly summary/detail is limited to that month,
- calendar opens on that month,
- month-scoped category analysis uses the same selected month.

Monthly trend charts may retain multi-month context where comparison is meaningful, but the detail panel and category block must follow the selected month.

### 5. Category analytics

Do not trust a stale cached current-month category distribution as the sole display source.

Build category aggregates from normalized Trackify/fan-site sessions for the requested date range. Each category row exposes:

- `streamCount`: number of broadcasts in which the category appears,
- `minutes`: total airtime in that category,
- `sharePercent`: category airtime / total categorized airtime × 100,
- `averageViewers`,
- `maxViewers` when available.

#### Current/selected month block

For the selected month, show rows in descending airtime with visible copy similar to:

`마인크래프트 · 8회 · 42시간 18분 · 31.4%`

Viewer metrics stay secondary.

#### Recent 3 months block

Aggregate sessions from the first day of the month two months before the current KST month through now. Show the same count / airtime / share fields.

### 6. In-progress stream overlay

Completed Trackify/fan-site sessions remain the historical source of truth, but an active stream should be reflected before it ends.

Create a transient current-session projection from live telemetry/state:

- start time -> now = current duration,
- current category = projected category segment,
- current viewer count may contribute to live-only display but must not be treated as a completed-session average unless sampled telemetry supports it.

Merge this projection only into today/current-month/recent-three-month display calculations. It must be removed/replaced when the completed session is persisted, keyed by broadcast/session identity to avoid double counting.

### 7. SOOP overview cleanup

Remove the `이번 달 후원자` KPI from the rendered card list.

Keep the previously removed star-related/mute cards removed. Do not reintroduce Auro/Streams Charts/source badges.

## Data freshness and cache behavior

- Trackify history cache remains last-good persistent data.
- The snapshot workflow refreshes Trackify history on its existing schedule.
- Five-minute SOOP telemetry supplies current live state and current-session samples.
- The browser continues using last-good local dashboard cache for instant initial rendering, then refreshes from the API.
- If the latest external request fails, retain last-good historical data and mark only live state as unknown when necessary.

## Files expected to change

Likely implementation files:

- `lib/chunbong-data.js`
- `lib/soop-external.js`
- `lib/soop-analytics.js`
- `scripts/collect-soop-telemetry.mjs`
- `scripts/update-trackify-soop-cache.mjs`
- a new follower-history updater/data file if Trackify exposes suitable dated values
- `data.js` and/or `data-enhancements.js`
- `data.css` / `data-enhancements.css` only for period controls/layout
- SOOP data regression tests
- production smoke checks

No unrelated fan-site pages or YouTube collection code should be refactored.

## Failure handling

- Live source disagreement: prefer explicit LIVE; otherwise unknown instead of false OFFLINE.
- Trackify unavailable: use last-good Trackify cache and fan-site session history.
- Missing favorite/follower history: show gaps; never fabricate a delta.
- Missing category viewer metrics: still show count, airtime, and percentage.
- Current session lacks category: group only the known category intervals and leave unknown time uncategorized.

## Testing strategy

Add regression tests before implementation for:

1. Explicit SOOP live signal overrides stale offline HTML text.
2. No positive live signal plus fetch failures returns unknown, not false offline.
3. `이번 달 후원자` is absent from rendered SOOP overview.
4. Rolling week boundaries are exactly 7 KST dates and current week is default.
5. Previous rolling-week buckets filter the correct dates.
6. Month chips are generated from actual available months and select the correct detail/calendar data.
7. Historical follower observations merge without interpolation and produce correct daily/monthly deltas.
8. Current-month category aggregation reports correct `streamCount`, `minutes`, `sharePercent`.
9. Recent-three-calendar-month category range begins on the first day two months before the current month.
10. Active-stream projection appears in current period/category totals and is not double-counted after finalization.
11. Existing YouTube and other fan-site regressions remain green.
12. Production smoke validates live-state contract, period-control tokens, category shapes, and non-fallback API response.

## Acceptance criteria

The change is complete when production demonstrates all of the following:

- A currently live Chunbong broadcast is not displayed as `OFFLINE`.
- SOOP overview does not contain `이번 달 후원자`.
- Daily history can switch among today-anchored rolling seven-day periods.
- Monthly history can switch among all available data months.
- Favorite/follower charts include every verified historical internet observation available to the collector, with gaps left where no exact value exists.
- Selected-month category rows show count, airtime, and percentage.
- A recent-three-month category block shows the same metrics.
- An active broadcast updates current-period totals without waiting for stream completion and without later duplication.
- Full site regression and production smoke pass after Vercel deployment.
