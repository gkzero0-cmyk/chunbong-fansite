# Operator Redis Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop operator-center features from probing the exhausted shared Redis, make the site ready for a dedicated native Upstash operator database, and preserve historical analytics through an RDB import before cutover.

**Architecture:** Authentication remains Redis-independent through the signed session fallback. Operator-only analytics/security/session-index data uses Redis only when `OPERATOR_REDIS_REST_URL` and `OPERATOR_REDIS_REST_TOKEN` are configured; the shared Vercel KV is treated as legacy source data and is never deleted by this change. Historical restoration uses Upstash RDB Export/Import before the Vercel environment-variable cutover, avoiding lossy key-by-key migration of HyperLogLog values.

**Tech Stack:** Node.js 22, Vercel Functions, Upstash Redis REST, existing vanilla JS operator center.

**Spec:** Current conversation requirement: dedicated native Upstash for operator data, preserve/restore old analytics, avoid further shared-Redis command consumption.

## Global Constraints

- Do not delete or mutate legacy shared Redis data as part of cutover preparation.
- Operator authentication must continue working when Redis is unavailable.
- No new Vercel Function route; continue multiplexing through `/api/content`.
- Developer API remains optional and only activates when native Upstash credentials are configured.
- Historical RDB import must occur before enabling `OPERATOR_REDIS_*` in Production.

## Review Focus

- Shared Redis is over quota: operator analytics/security/session-detail requests must not probe it.
- Dedicated Redis missing: operator UI must degrade explicitly instead of returning misleading zeros.
- Dedicated Redis configured: all existing operator Redis helpers must select it automatically.
- Authentication without Redis: GitHub/email signed-session flow must remain functional.
- Historical import: no code path may delete legacy shared keys.

---

### Task 1: Dedicated-store cutover guard

**Files:**
- Modify: `lib/operator-center-api.js`
- Test: `tests/operator-dedicated-store-cutover-regression.mjs`

- [ ] Write the failing regression test for dedicated-only operator analytics/security/session-index behavior.
- [ ] Run CI and confirm the new test fails on the current implementation.
- [ ] Gate operator-only Redis reads/writes behind `hasDedicatedOperatorRedis()` while leaving signed authentication functional.
- [ ] Expose migration readiness in system status without querying Redis.
- [ ] Run regression and browser smoke suites.

### Task 2: Operator UI cutover visibility

**Files:**
- Modify: `operator-redis-diagnostics.js`
- Test: `tests/operator-dedicated-store-cutover-regression.mjs`

- [ ] Show dedicated-store connected/waiting state from `resourceBudget.isolatedStores.operator`.
- [ ] Explain that historical data restoration is via Upstash RDB import and that official monthly usage becomes available after Developer API setup.
- [ ] Run regression and visual audits.

### Task 3: Release verification

**Files:** none beyond Tasks 1-2.

- [ ] Open PR from the isolated branch.
- [ ] Verify all required CI checks pass.
- [ ] Merge only the tested head SHA.
- [ ] Verify Production is READY, version is synchronized, auth-config is healthy, OAuth start redirects, and latest deployment has no new fatal/error regression.