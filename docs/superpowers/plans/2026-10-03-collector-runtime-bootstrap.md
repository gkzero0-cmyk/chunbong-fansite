# Collector Runtime Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Chunbong content collector into a thin Tampermonkey bootstrap plus remotely loaded runtime so routine collector updates no longer require reinstalling the userscript.

**Architecture:** Keep privileged `@match`/`@grant` behavior and a narrow GM bridge inside `chunbong-content-collector.user.js`, move current collection logic into `collector-runtime.js`, and use `collector-runtime-manifest.json` as the cache-busted source of truth for runtime version and compatibility. Persist a last-known-good runtime in existing Tampermonkey storage so remote runtime failures degrade safely instead of disabling collection.

**Tech Stack:** JavaScript userscript, Tampermonkey 5.5.x stable, Node.js 22 test runner, Vercel static hosting/config headers.

**Spec:** `docs/superpowers/specs/2026-10-03-collector-runtime-bootstrap-design.md`

## Global Constraints

- Tampermonkey 5.5.x stable must remain supported; do not require Tampermonkey 5.6 beta.
- Preserve existing collector storage keys, channel names, queue/history/backfill data, and SOOP/FM Korea tab serialization behavior.
- Keep `AUTO_OPEN_MAX_ACTIVE=1` semantics.
- Do not add external services, databases, or paid dependencies.
- `/chunbong-content-collector.user.js`, `/collector-runtime-manifest.json`, and `/collector-runtime.js` must be served with no-cache/no-store/must-revalidate semantics.
- Runtime URLs must remain same-origin under `https://chunbong-fansite.vercel.app/`.
- Userscript reinstall should only be required when metadata grants/matches or the bootstrap/runtime contract changes incompatibly.

## Review Focus

- Manifest returns an incompatible bridge contract: bootstrap must reject it and fall back safely.
- Manifest/runtime fetch succeeds through a redirect or malformed URL: bootstrap must still reject non-fansite origins.
- Runtime source downloads but throws during initialization: bootstrap must not mark it as last-known-good and must try the previous cached runtime.
- Stored last-known-good runtime is corrupt or from the wrong contract: bootstrap must enter degraded mode without deleting queue/history state.
- Runtime-only version changes while bootstrap version is unchanged: Operator Center must report the new runtime and must not request a userscript reinstall.

---

### Task 1: Lock migration behavior with failing tests

**Files:**
- Create: `test/collector-runtime-bootstrap.test.js`
- Modify: `test/collector-install-update.test.js`
- Reference: `test/collector-auto-tab-serialization-regression.mjs`

**Interfaces:**
- Consumes: existing userscript metadata and existing storage key constants.
- Produces: test contract for bootstrap metadata, runtime manifest, same-origin validation, cache headers, existing storage keys, and runtime-only version reporting.

- [ ] **Step 1: Write the failing bootstrap structure test**

Assert that `chunbong-content-collector.user.js` declares the existing `@match`/GM grants, declares a bootstrap contract constant, references `/collector-runtime-manifest.json`, and no longer contains full SOOP/FM Korea/Namuwiki parser implementation markers such as `captureSoopPost`, `captureFmkPost`, and `captureNamu`.

- [ ] **Step 2: Write the failing migration compatibility test**

Assert that the future runtime file contains the existing storage keys: `cb-content-collector-queue-v1`, `cb-content-collector-seen-v1`, `cb-soop-history-v2`, `cb-soop-backfill-v2`, `cb-content-collector-status-v1`, and `cb-soop-diagnostics-v1`, and still contains `AUTO_OPEN_MAX_ACTIVE=1`.

- [ ] **Step 3: Write the failing manifest/cache test**

Assert `collector-runtime-manifest.json` exists with `runtimeVersion`, `runtimeUrl`, `minBootstrapContract`, `maxBootstrapContract`, and `disabled`, and assert Vercel headers use `no-cache, no-store, must-revalidate` for all three collector resources.

- [ ] **Step 4: Write the failing Operator Center runtime-status test**

Assert the Operator Center/helper source can display bootstrap version, runtime version, runtime state, last runtime check time, and reinstall-required state independently.

- [ ] **Step 5: Run targeted tests and verify RED**

Run: `npm test -- --test-name-pattern="collector runtime|collector update"`
Expected: FAIL because manifest/runtime/bootstrap split is not implemented yet.

- [ ] **Step 6: Commit**

```bash
git add test/collector-runtime-bootstrap.test.js test/collector-install-update.test.js
git commit -m "test: define collector runtime bootstrap contract"
```

### Task 2: Extract the existing collector into `collector-runtime.js`

**Files:**
- Create: `collector-runtime.js`
- Modify: `chunbong-content-collector.user.js`
- Test: `test/collector-runtime-bootstrap.test.js`
- Test: `tests/collector-auto-tab-serialization-regression.mjs` or current equivalent path if retained

**Interfaces:**
- Consumes: bridge object `bootstrapBridge` supplied by the bootstrap with `{getValue,setValue,deleteValue,addValueChangeListener,openInTab,registerMenuCommand,bootstrapVersion,bootstrapContract,publishStatus}`.
- Produces: global entry `window.__CHUNBONG_COLLECTOR_RUNTIME__ = { version, contract, init(bootstrapBridge) }` or equivalent closure-safe runtime registration consumed by Task 3.

- [ ] **Step 1: Move the current v1.4.8 collector implementation into `collector-runtime.js` without intentional behavior changes**

Replace direct `GM_*` access with the bridge methods while preserving all existing storage keys, event names, hashes, watcher intervals, queue limits, media collector version, and automatic tab claim logic.

- [ ] **Step 2: Add runtime metadata**

Set exact initial values `runtimeVersion = '1.0.0'` and `runtimeContract = 1` and expose one initialization entrypoint.

- [ ] **Step 3: Keep automatic tab serialization unchanged**

Verify `AUTO_OPEN_MAX_ACTIVE=1`, claim expiry, SOOP discovery, FM Korea discovery, and release behavior remain in the runtime.

- [ ] **Step 4: Run targeted regression tests**

Run: `node --test test/collector-runtime-bootstrap.test.js tests/collector-auto-tab-serialization-regression.mjs`
Expected: bootstrap migration tests still partially fail, serialization tests PASS.

- [ ] **Step 5: Commit**

```bash
git add collector-runtime.js chunbong-content-collector.user.js test/collector-runtime-bootstrap.test.js tests/collector-auto-tab-serialization-regression.mjs
git commit -m "refactor: extract collector runtime"
```

### Task 3: Implement the thin Tampermonkey bootstrap and last-known-good fallback

**Files:**
- Modify: `chunbong-content-collector.user.js`
- Test: `test/collector-runtime-bootstrap.test.js`

**Interfaces:**
- Consumes: manifest shape `{runtimeVersion,runtimeUrl,minBootstrapContract,maxBootstrapContract,disabled}` and runtime registration from Task 2.
- Produces: bootstrap constants `BOOTSTRAP_VERSION`, `BOOTSTRAP_CONTRACT=1`, bridge methods, runtime state publication, and last-known-good storage records.

- [ ] **Step 1: Add bootstrap constants and storage keys**

Use `BOOTSTRAP_CONTRACT=1`; use dedicated new keys for last-known-good runtime source/version/contract/timestamp without changing existing collector data keys.

- [ ] **Step 2: Implement manifest fetch**

Fetch `https://chunbong-fansite.vercel.app/collector-runtime-manifest.json` with `cache:'no-store'` plus a timestamp query. Reject non-2xx responses and incompatible contract ranges.

- [ ] **Step 3: Implement same-origin runtime URL validation**

Resolve `runtimeUrl` against the production fansite origin and reject any resolved origin other than `https://chunbong-fansite.vercel.app`.

- [ ] **Step 4: Implement runtime fetch/evaluation**

Fetch with `cache:'no-store'` plus cache-busting; evaluate in the userscript sandbox; require a matching contract and an `init` function before calling it.

- [ ] **Step 5: Persist last-known-good only after successful initialization**

Store source/version/contract/timestamp only when runtime initialization completes successfully.

- [ ] **Step 6: Implement fallback and degraded state**

If manifest, runtime download, parse, or initialization fails, attempt stored last-known-good only when contract `1` matches; otherwise publish `degraded` without clearing any existing queue/history/backfill state.

- [ ] **Step 7: Handle manifest `disabled:true`**

Do not initialize remote or cached automatic collection; publish `disabled` state while retaining all stored collector data.

- [ ] **Step 8: Run bootstrap tests**

Run: `node --test test/collector-runtime-bootstrap.test.js`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add chunbong-content-collector.user.js test/collector-runtime-bootstrap.test.js
git commit -m "feat: add resilient collector bootstrap loader"
```

### Task 4: Add runtime manifest and cache policy

**Files:**
- Create: `collector-runtime-manifest.json`
- Modify: `vercel.json`
- Test: `test/collector-runtime-bootstrap.test.js`

**Interfaces:**
- Produces manifest with exact initial values: `runtimeVersion:"1.0.0"`, `runtimeUrl:"/collector-runtime.js"`, `minBootstrapContract:1`, `maxBootstrapContract:1`, `disabled:false`.

- [ ] **Step 1: Add the initial manifest**

Create the manifest with the exact initial values above.

- [ ] **Step 2: Add dedicated no-stale-cache headers**

Add route-specific `Cache-Control`, `CDN-Cache-Control`, and `Vercel-CDN-Cache-Control` values `no-cache, no-store, must-revalidate` for the userscript, runtime manifest, and runtime JS.

- [ ] **Step 3: Run cache/manifest tests**

Run: `node --test test/collector-runtime-bootstrap.test.js test/collector-install-update.test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add collector-runtime-manifest.json vercel.json test/collector-runtime-bootstrap.test.js test/collector-install-update.test.js
git commit -m "feat: publish collector runtime manifest"
```

### Task 5: Extend Operator Center diagnostics for bootstrap/runtime separation

**Files:**
- Modify: `operator-collector-install-helper.js`
- Modify: the Operator Center collector status renderer file located by searching for `data-unified-collector` / `data-chunbong-collector-version`
- Test: `test/collector-runtime-bootstrap.test.js`

**Interfaces:**
- Consumes runtime status fields published by bootstrap/runtime: `bootstrapVersion`, `runtimeVersion`, `runtimeState`, `lastRuntimeCheckAt`, `lastRuntimeLoadedAt`, `reinstallRequired`.
- Produces UI text that distinguishes bootstrap update requirements from runtime-only updates.

- [ ] **Step 1: Add runtime status fields to the existing bridge/state payload**

Preserve current collector `state` event shape and add the six fields above.

- [ ] **Step 2: Render bootstrap and runtime versions separately**

Show both values on the collector status card and show one of `current`, `cached fallback`, `degraded`, or `disabled` for runtime state.

- [ ] **Step 3: Change update guidance**

When `reinstallRequired=false`, explicitly state that runtime updates apply without reinstalling Tampermonkey. Only show bootstrap reinstall/update guidance when metadata/contract requires it.

- [ ] **Step 4: Keep the stable 5.5.x manual fallback button**

Retain the existing `5.5 정식판용 파일 받기` path for the one-time bootstrap upgrade and future rare bootstrap upgrades.

- [ ] **Step 5: Run UI contract tests**

Run: `node --test test/collector-runtime-bootstrap.test.js test/collector-install-update.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add operator-collector-install-helper.js test/collector-runtime-bootstrap.test.js test/collector-install-update.test.js
git commit -m "feat: show collector bootstrap and runtime status"
```

### Task 6: Full regression verification and preview rollout

**Files:**
- No intentional production-code changes unless a failing regression requires a fix.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified branch ready for PR/production rollout.

- [ ] **Step 1: Run the complete project test suite**

Run: `npm test`
Expected: all tests PASS; report any pre-existing failures by exact test name if present.

- [ ] **Step 2: Verify the userscript is thin**

Confirm the bootstrap no longer contains full parser bodies while `collector-runtime.js` contains the migrated SOOP/FM Korea/Namuwiki logic and unchanged storage keys.

- [ ] **Step 3: Verify preview deployment headers**

Check the preview responses for the userscript, runtime manifest, and runtime JS. Expected `Cache-Control` semantics include no-cache/no-store/must-revalidate and no stale runtime delivery.

- [ ] **Step 4: Verify runtime state in a preview Operator Center**

Expected: bootstrap version, runtime `1.0.0`, runtime state `current`, recent runtime check/load timestamps, and `reinstallRequired=false` after successful bootstrap installation.

- [ ] **Step 5: Exercise failure modes**

Temporarily point a preview-only manifest/runtime to an invalid runtime or incompatible contract and verify cached fallback/degraded behavior without losing collector data.

- [ ] **Step 6: Commit verification-only fixes if needed**

Use focused commits per regression if any code change is required.

### Task 7: Production rollout and post-deploy checks

**Files:**
- No code changes unless rollout verification finds a defect.

**Interfaces:**
- Produces the one-time bootstrap release followed by runtime-only update capability.

- [ ] **Step 1: Open and review the implementation PR**

Confirm the diff contains only the bootstrap/runtime migration, manifest/cache policy, diagnostics, and tests.

- [ ] **Step 2: Merge only after tests and preview checks are green**

Use the repository's normal merge method.

- [ ] **Step 3: Verify Vercel Production is READY for the merged SHA**

Confirm the production deployment points to the merge SHA.

- [ ] **Step 4: Verify Production resources**

Check `/chunbong-content-collector.user.js`, `/collector-runtime-manifest.json`, and `/collector-runtime.js` for correct content/version and cache headers.

- [ ] **Step 5: Verify Production runtime logs/errors**

Confirm no new collector-related runtime errors after deployment.

- [ ] **Step 6: Perform the one-time bootstrap update**

Update the installed Tampermonkey collector from v1.4.8 to the new bootstrap release using the stable 5.5.x file fallback if Chrome does not invoke the install UI.

- [ ] **Step 7: Prove runtime-only delivery**

Make a no-op runtime version bump in a follow-up test release (for example `1.0.0` → `1.0.1` with no bootstrap version change), deploy it, reopen a supported page, and verify Operator Center reports the new runtime without requesting userscript reinstall.

- [ ] **Step 8: Close rollout**

Document the bootstrap version and runtime version that are live and keep the previous runtime as rollback reference.
