# Chunbong Data Dashboard Reliability Design

## Goal

Make the existing Chunbong data page reliably expose the public SOOP statistics available from Trackify (excluding donor ranking and individual donation/mission/sanction records), improve trend exploration, restore YouTube channel metrics and Shorts-aware recent uploads, and make the manual refresh button fetch a genuinely fresh response.

## Scope

### SOOP / Trackify

Keep SOOP official public values as the first choice where available. Use Trackify as the primary external fill source, then existing Auro/Softc/Streams Charts fallbacks only for fields Trackify/SOOP cannot provide.

Parse and expose the Trackify summary information that is useful for a fan analytics dashboard:
- current live/favorite/subscriber values when present;
- monthly broadcast time, peak viewers, average viewers, unique viewers, viewership hours, supporter count, chat count, aggregate kick/mute counts, monthly star-balloon count and stars per hour;
- cumulative users, cumulative UP, cumulative broadcast time, fanclub, supporter, station opening date and latest broadcast date;
- category ranking text and category distribution;
- broadcast/session records already available from existing fan-site measurements and external history.

Explicitly exclude:
- donor ranking tables;
- individual star-balloon events;
- individual mission events;
- individual kick/mute/sanction histories.

Every externally filled metric keeps a source marker so the UI can distinguish SOOP, Trackify and other fallbacks.

### Trend UI

Retain the current page styling but upgrade the trend cards to interactive SVG line charts inspired by the referenced Saza member page interaction model: hover/focus point tooltips, date/value display, clearer grid/axis context and range-friendly dense histories. Daily/monthly/calendar navigation remains.

Add Trackify-backed growth/history series where snapshots are available. Do not fabricate historical values that were never collected.

### YouTube

Make channel statistics resilient to multiple public YouTube page structures rather than a single `ytInitialData` key path. Normalize Videos and Shorts with a comparable sortable publish date. Merge and deduplicate by video ID before sorting newest-first.

`이번 달 업로드` and `최근 업로드` must both include Shorts. Recent content must not be `videos + shorts` with a pre-sort slice.

### Manual refresh

The manual refresh button must bypass the normal CDN cache. The browser sends a cache-busting query and `cache: no-store`; the data API recognizes a refresh request and sends `Cache-Control: no-store, max-age=0`. Automatic 5-minute refresh may continue using the normal shared cache.

The button exposes loading/success/failure state and is temporarily disabled while a request is running.

## Data contract additions

`soop.overview` may add:
- `monthlyStarCount`
- `starsPerHour`
- `monthlyChatCount`
- `monthlyKickCount`
- `monthlyMuteCount`
- `stationOpenedAt`
- `latestBroadcastDate`
- `categoryRankings`

`soop.externalHistory.currentFallback` continues to expose the merged external raw summary including `categories` and new Trackify summary fields.

YouTube items gain `dateIso` when it can be derived. `youtube.recentVideos` and `youtube.recentShorts` remain for compatibility, while the UI merges and sorts them by `dateIso`/date.

## Error handling

A failed Trackify request must not make the whole data endpoint fall back if SOOP/YouTube still work. Missing individual metrics remain unavailable instead of being guessed. External parser failures remain visible through the existing source/error metadata.

YouTube tab failures are isolated: channel statistics and content lists may succeed independently.

## Testing

Add regression coverage for:
- Trackify summary parsing including monthly/cumulative/category fields and explicit donor-detail exclusion;
- external-source merge priority;
- YouTube Videos + Shorts dedupe and chronological merge;
- Shorts counting in monthly uploads;
- manual refresh cache-busting/no-store behavior;
- updated interactive chart/UI markers.

Run all `tests/*.mjs` plus syntax checks for changed JavaScript files. After merge/deploy, run production smoke against `/data.js`, `/data.html` and `/api/content?type=data` and verify the key metrics/arrays remain non-fallback.