# Collector Runtime Bootstrap Design

Date: 2026-10-03

## Goal

Make the current Tampermonkey installation effectively the last major manual installation for normal collector changes. The user should be able to keep using the stable Tampermonkey 5.5.x line while routine SOOP/FM Korea/Namuwiki collector fixes, parsing changes, UI bridge changes, and watcher changes are delivered from the Chunbong fansite Production deployment without reinstalling the userscript.

## Success Criteria

- Tampermonkey keeps only the permissions and host matches that must live inside the userscript.
- Normal collector behavior is delivered by a remotely loaded runtime hosted on the fansite.
- Opening a supported page checks for the latest compatible runtime without relying on stale CDN/browser cache.
- Existing collector state is preserved: queue, seen map, SOOP history, backfill state, diagnostics, and watcher state keep their existing storage keys.
- SOOP/FM Korea automatic discovery remains serialized to at most one automatic capture tab at a time.
- A failed runtime download or initialization does not permanently disable the collector.
- Operator Center shows bootstrap version, runtime version, runtime load status, and last runtime update check separately.
- Userscript reinstall is needed only when permissions, host matches, or the bootstrap/runtime bridge contract changes incompatibly.

## Non-Goals

- Do not move privileged GM APIs directly into ordinary page JavaScript.
- Do not change existing archive data formats unless required for compatibility.
- Do not introduce a new external service, database, or paid dependency.
- Do not require Tampermonkey 5.6 beta.

## Architecture

### 1. Bootstrap userscript

`chunbong-content-collector.user.js` becomes a thin privileged bootstrap.

Responsibilities:

- Keep all required `@match` declarations.
- Keep GM grants such as `GM_getValue`, `GM_setValue`, `GM_deleteValue`, `GM_addValueChangeListener`, `GM_openInTab`, and `GM_registerMenuCommand`.
- Expose a narrow bridge object to the runtime rather than exposing raw globals indiscriminately.
- Fetch the runtime manifest with a cache-busting query and `cache: 'no-store'`.
- Validate runtime compatibility against the bootstrap contract version.
- Fetch and execute the runtime.
- Save the last known-good runtime in Tampermonkey storage for fallback.
- Publish bootstrap/runtime status to the existing Operator Center bridge attributes/events.

The bootstrap should not contain the SOOP/FM Korea/Namuwiki parsing implementation beyond a minimal emergency fallback needed to report failure and keep the operator bridge alive.

### 2. Runtime manifest

Add `collector-runtime-manifest.json`.

Minimum fields:

```json
{
  "runtimeVersion": "1.0.0",
  "runtimeUrl": "/collector-runtime.js",
  "minBootstrapContract": 1,
  "maxBootstrapContract": 1,
  "disabled": false
}
```

The manifest is the single source of truth for which runtime should execute. It must be served with no-cache/no-store/must-revalidate semantics.

The optional `disabled` flag is an emergency kill switch for remote runtime execution. When set, the bootstrap should stop automatic collection, surface a clear status, and retain stored data.

### 3. Remote runtime

Add `collector-runtime.js` and move the existing collector implementation into it with minimal semantic changes.

The runtime receives a bootstrap bridge containing:

- storage read/write/delete
- value-change listener registration
- background-tab opening
- menu command registration
- bootstrap metadata
- status publication helper

The runtime owns:

- queue/seen/history/backfill/diagnostic logic
- Namuwiki collection
- SOOP collection and media extraction
- FM Korea collection
- automatic discovery and claim serialization
- watcher scheduling
- Operator Center command bridge
- self-test and backfill behavior

All existing storage keys stay unchanged during the migration.

### 4. Last-known-good fallback

After a runtime downloads successfully and initializes successfully, the bootstrap stores:

- runtime source
- runtime version
- saved timestamp
- bootstrap contract version

If the manifest fetch, runtime fetch, runtime parse, or initialization fails, the bootstrap attempts the last known-good runtime only when its stored contract is compatible with the current bootstrap.

If both remote and cached runtime fail, the bootstrap enters degraded mode and reports the failure to Operator Center without deleting queue/history/state.

### 5. Versioning

Two versions are shown separately:

- **Bootstrap version**: userscript package version, changed rarely.
- **Runtime version**: remote collector logic version, changed for routine fixes.

The bridge contract has its own integer version so a future incompatible API change can explicitly require a new bootstrap.

Example:

- Bootstrap: `1.5.0`
- Bootstrap contract: `1`
- Runtime: `1.0.7`

Routine collector changes should only increment the runtime version.

## Cache Policy

The following resources must have explicit no-stale-cache headers:

- `/chunbong-content-collector.user.js`
- `/collector-runtime-manifest.json`
- `/collector-runtime.js`

Use client cache-busting query parameters for manifest/runtime fetches as an additional safeguard.

Within one page lifecycle, the runtime is loaded only once. No polling loop should continuously redownload the runtime on the same page.

## Security and Privilege Boundaries

The runtime is trusted first-party code served only from the fansite Production origin.

The bootstrap must reject runtime URLs that resolve outside the configured fansite origin. The manifest cannot redirect execution to an arbitrary third-party domain.

Only explicit bridge methods are exposed. Raw GM functions should remain closure-scoped where practical.

## Operator Center UX

The collector status card should show:

- Bootstrap version
- Runtime version
- Runtime state: current / cached fallback / degraded / disabled
- Last runtime check time
- Last successful runtime load time
- Whether a userscript reinstall is required

The existing `자동 수집기 설치 / 업데이트` action remains available for bootstrap updates. When only the runtime is newer, Operator Center should say that no Tampermonkey reinstall is required.

## Migration

1. Start from the current v1.4.8 behavior as the baseline.
2. Extract the collector body into `collector-runtime.js` without intentionally changing collector semantics.
3. Add a bootstrap userscript that loads the runtime and passes the GM bridge.
4. Preserve all existing storage keys and event/channel names during the first migration.
5. Publish the runtime manifest and no-cache headers.
6. Add Operator Center runtime diagnostics.
7. Perform a one-time bootstrap update from v1.4.8 to the new bootstrap release.
8. After that update, routine collector fixes ship as runtime-only releases.

## Testing Strategy

### Regression tests

Keep the current collector serialization regression coverage, including `AUTO_OPEN_MAX_ACTIVE=1` behavior.

### New tests

- Bootstrap contains required metadata/grants but not the full collector implementation.
- Manifest compatibility validation accepts compatible runtimes and rejects incompatible ones.
- Runtime URLs are restricted to the fansite origin.
- Runtime resources have no-store/no-cache headers.
- Existing storage keys remain unchanged.
- Remote runtime is preferred when healthy.
- Last-known-good runtime is used when the remote runtime fails.
- Degraded mode preserves state and reports an actionable status.
- Operator Center distinguishes bootstrap and runtime versions.
- Runtime-only release does not require userscript version change.

## Rollout and Safety

Use a dedicated implementation branch and keep the current v1.4.8 code available as a rollback reference.

Do not merge the migration until:

- the full project test suite passes,
- the extracted runtime reproduces current SOOP/FM Korea/Namuwiki flows,
- a preview deployment verifies runtime loading and fallback,
- Production headers for manifest/runtime are confirmed,
- Production runtime error logs show no new collector-related errors after rollout.

If the remote runtime causes a regression after release, the manifest can point back to the previous runtime version or temporarily set `disabled: true` while retaining the bootstrap and stored state.

## Expected User Experience

After the one-time bootstrap migration, the user can stay on stable Tampermonkey 5.5.x. Normal collector updates are delivered by the fansite Production deployment. A userscript reinstall is only requested when the bootstrap permissions, site matches, or bridge contract must change.