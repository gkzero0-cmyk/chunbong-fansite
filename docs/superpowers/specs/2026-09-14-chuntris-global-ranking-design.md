# Chuntris Global Ranking & Side Panel Redesign

## Goal

Add a global leaderboard to Chuntris while preserving the existing game rules and visual identity. Rebalance the desktop layout so the playfield remains central, HOLD and NEXT stay beside the board, the score panel moves under HOLD, the character card becomes larger, and the currently unused outer left/right space is used for the global leaderboard and keyboard guide.

## Scope

This change adds one small persistent subsystem: a global ranking API backed by Upstash Redis. It also restructures the Chuntris desktop/mobile presentation without changing the engine's gameplay behavior.

Included:
- Global TOP 10 leaderboard in the left outer rail.
- Separate ranking tabs for Classic and 40-line Sprint.
- Player nickname input before starting a game.
- One best record per nickname per mode.
- Classic ranking ordered by highest score.
- Sprint ranking ordered by fastest completed time.
- HOLD remains left of the board but becomes shorter.
- Current-player score panel moves directly below HOLD and becomes larger.
- NEXT remains right of the board and becomes larger.
- Character card remains under NEXT and becomes larger.
- Keyboard instructions move to the right outer rail.
- Responsive/mobile layout retains all information without clipping.

Not included:
- Login/account system.
- Strong anti-cheat or identity verification.
- Public profile pages.
- Historical per-run records.
- Admin UI.

## Desktop Layout

Desktop uses five visual columns inside the available page width:

1. **Global ranking rail** — outer left.
2. **HOLD + current score rail** — inner left.
3. **Game board** — center.
4. **NEXT + character rail** — inner right.
5. **Keyboard help rail** — outer right.

The board remains the primary sizing anchor. Side rails must fit inside the same viewport-bounded stage height and must not increase the page's minimum width. At narrower desktop widths, the two outer rails collapse below the main three-column game stage before the board itself is reduced aggressively.

### Relative sizing

- Global ranking: about 220–260 px at wide desktop.
- HOLD/current score: about 160–190 px.
- Board: derived from viewport height, preserving 1:2 ratio.
- NEXT/character: about 180–220 px.
- Keyboard help: about 200–240 px.

HOLD should occupy only the canvas space needed for one piece. NEXT should be visually dominant over HOLD because it shows five upcoming pieces.

## Mobile Layout

For widths at or below 820 px, content becomes a single flow. Order:

1. Board
2. Current score
3. NEXT
4. HOLD
5. Global ranking
6. Keyboard guide

The existing touch controls remain sticky at the bottom. The character card may appear directly under NEXT when space allows; it must not force horizontal scrolling.

## Nickname Flow

A nickname field is shown in the toolbar near the mode selector/start button.

Rules:
- Required before starting a new game.
- Trim leading/trailing whitespace.
- 2–16 visible characters.
- Korean, Latin letters, digits, spaces, `_`, `-` allowed.
- Control characters and HTML are rejected.
- Last successful nickname is remembered in `localStorage` for convenience.

If the nickname is missing or invalid, Start is blocked and an inline status message explains the problem.

## Ranking Rules

Two independent leaderboards are maintained.

### Classic

Sort by:
1. Higher `score` first.
2. Higher `lines` as tie-breaker.
3. Earlier `achievedAt` as final tie-breaker.

Only a nickname's best Classic result is retained.

### Sprint 40

Only completed 40-line runs are submitted.

Sort by:
1. Lower `timeMs` first.
2. Higher `score` as tie-breaker.
3. Earlier `achievedAt` as final tie-breaker.

Only a nickname's fastest completed Sprint result is retained.

## Persistence: Upstash Redis

Use Upstash Redis REST API from Vercel serverless functions. Do not expose Upstash credentials to browser JavaScript.

Expected Vercel environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

No extra npm dependency is required; serverless code can call Upstash REST with `fetch`.

### Redis keys

Use namespaced keys:
- `chuntris:classic:players`
- `chuntris:sprint40:players`

Each key stores a JSON object keyed by a normalized nickname identifier. Each value stores the display nickname and the best record for that mode.

Example Classic value:

```json
{
  "displayName": "춘봉",
  "score": 41554,
  "lines": 82,
  "level": 9,
  "achievedAt": "2026-09-14T00:00:00.000Z"
}
```

Example Sprint value:

```json
{
  "displayName": "춘봉",
  "timeMs": 91321,
  "score": 8200,
  "lines": 40,
  "achievedAt": "2026-09-14T00:00:00.000Z"
}
```

For the expected small community size, reading/updating the JSON map is acceptable and minimizes operational complexity. If the leaderboard grows substantially, migrate to Redis sorted sets later without changing the client API contract.

## API

Create `api/chuntris-ranking.js`.

### GET `/api/chuntris-ranking?mode=classic|sprint40`

Returns the top 10 leaderboard.

Response:

```json
{
  "mode": "classic",
  "entries": [
    {
      "rank": 1,
      "nickname": "춘봉",
      "score": 41554,
      "lines": 82,
      "level": 9,
      "achievedAt": "2026-09-14T00:00:00.000Z"
    }
  ]
}
```

Sprint entries replace Classic-specific fields as needed and include `timeMs`.

### POST `/api/chuntris-ranking`

Request:

```json
{
  "mode": "classic",
  "nickname": "춘봉",
  "score": 41554,
  "lines": 82,
  "level": 9,
  "timeMs": 180000
}
```

Server behavior:
- Validate mode and nickname.
- Validate all numeric fields as finite non-negative integers within conservative upper bounds.
- Sprint requires exactly 40 or more completed lines and a positive `timeMs`.
- Compare with stored best for the normalized nickname.
- Update only if the result is better for that mode.
- Return whether the record changed plus the current top 10.

The API must use `Cache-Control: no-store` for POST and a short public cache (for example 10–15 seconds with stale-while-revalidate) for GET.

## Integrity & Abuse Controls

Because gameplay runs in the browser, rankings cannot be made fully cheat-proof without authentication/server-authoritative gameplay. This design intentionally targets casual abuse resistance only.

Minimum safeguards:
- Strict server-side schema/range validation.
- Reject malformed or oversized nickname/body input.
- Same-origin POST expectation and JSON-only requests.
- Simple per-IP rate limiting if a reliable existing mechanism is available; otherwise defer rather than adding another service.
- Never trust HTML from nicknames; render via `textContent` only.

The UI should not claim records are verified.

## Client Integration

`chuntris.js` gains a small ranking controller responsible for:
- Nickname validation and persistence.
- Loading the active mode leaderboard.
- Switching leaderboard data when mode changes.
- Submitting a record when a Classic game ends or Sprint completes.
- Re-rendering TOP 10 after a successful submission.
- Showing lightweight loading/error states without blocking gameplay if leaderboard API is unavailable.

Ranking failures must never break the game loop.

## UI Components

### Global ranking panel

Header: `전체 랭킹`

Tabs:
- `클래식`
- `40줄`

Rows:
- rank
- nickname
- primary metric (`점수` or formatted time)

The user's own nickname, if present in TOP 10, receives the existing orange accent.

### Current score panel

Moved below HOLD. Display cards are larger than the current implementation:
- SCORE
- LEVEL
- LINES
- TIME
- BEST

### NEXT panel

Retains five-piece preview but receives more width/height than HOLD.

### Character card

Moves/retains position under NEXT and scales substantially larger than the current ~92 px reaction sprite. Continue using the transparent high-resolution reaction asset already introduced.

### Keyboard guide

Moves to the outer right rail and remains visible on normal desktop widths. It may collapse below the game on narrow layouts.

## Files Expected to Change

- `chuntris.html` — nickname input, ranking panel, score/help panel placement.
- `chuntris.css` — five-column desktop arrangement, responsive collapse, component sizing.
- `chuntris.js` — nickname flow, ranking fetch/submit/render integration.
- `api/chuntris-ranking.js` — Redis-backed ranking endpoint.
- `.github/workflows/chuntris-production-smoke.yml` and/or Chuntris regression tests — verify new layout/API-safe behavior.
- `docs/superpowers/specs/2026-09-14-chuntris-global-ranking-design.md` — this document.

No changes are required to `chuntris-engine.js` unless implementation reveals a missing end-of-game signal that cannot be consumed from the existing app controller.

## Testing

### Unit/static regression

Verify:
- HOLD remains left of board; NEXT remains right.
- Score panel is under HOLD.
- Character card is under NEXT.
- Global ranking and keyboard rails exist.
- Nickname validation accepts/rejects expected inputs.
- Record comparison logic correctly preserves only the better result.
- API rejects malformed input and missing Redis configuration with controlled errors.

### Browser smoke

At minimum:
- 1280×900
- 1280×740
- 900×800
- 390×844
- 360×800

Assertions:
- no horizontal overflow;
- board not clipped;
- desktop five-region arrangement fits when breakpoint allows;
- narrow desktop collapses outer rails without hiding core gameplay;
- mobile ordering is correct;
- ranking panel loads or shows a non-blocking error state;
- gameplay controls still work.

### API smoke

With Upstash variables configured in Preview:
- GET empty leaderboard returns 200 and empty entries.
- POST valid Classic record stores it.
- Lower Classic score for same nickname does not replace it.
- Higher Classic score replaces it.
- Sprint incomplete run is rejected.
- Faster Sprint completion replaces slower one.

## Deployment

1. Implement on a feature branch, not `main`, to avoid unnecessary Production deployments while Vercel Hobby build limits are active.
2. Configure Upstash Redis environment variables for Preview and Production before enabling live submissions.
3. Validate Preview API and UI.
4. Merge once CI and Preview smoke pass.
5. After Vercel Production deployment is available, run the existing Chuntris production smoke plus ranking GET verification.

If Redis credentials are missing in Production, the leaderboard must fail gracefully while Chuntris gameplay remains usable.
