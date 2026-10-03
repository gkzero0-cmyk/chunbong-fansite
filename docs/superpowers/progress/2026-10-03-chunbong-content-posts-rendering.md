# SDD ledger — plan: docs/superpowers/plans/2026-10-03-chunbong-content-posts-rendering.md

Pre-flight: Task 1 produces postCanonicalKey/mergePostRows/normalizePostRows; Tasks 2 and 3 consume normalizePostRows. Task 4 consumes the asset paths changed in Task 2. No interface conflicts found.

Task 1: Ruling: open a draft PR before Task 4 solely to execute pull-request CI because this environment cannot clone GitHub or run the repository locally — preserves required RED/GREEN evidence without changing the implementation scope — cost if wrong: an implementation PR becomes visible earlier than planned, but remains draft and unmergeable until verification.

Task 1 RED: Site regression run 37085121705 failed at `tests/chunbong-post-normalization-regression.mjs` because `postCanonicalKey` was undefined; prior regressions reached that test successfully.
Task 1 implementation: commit `4d4a2e8cb5e7e1a4d29e987daf26e5c46090cc97` added the minimal normalization helpers and exports.
Task 1 RED refinement: Site regression run 37085384670 caught URL-less rows collapsing because `safeUrl('')` resolves against the site base URL; expected 6 normalized rows, got 5.
Task 1 fix: commit `8b4bcbf2d1c0c6c1be0eb7a01528129fcb028cf1` now treats empty raw URLs as absent before canonicalization/URL scoring.
Task 1: complete (tests: Site regression run 37085559310 → success; JavaScript syntax + full tests/*.mjs loop green, including chunbong-post-normalization-regression.mjs).

Task 2 RED setup: `tests/chunbong-post-card-regression.mjs` defines the stable in-card DOM contract. Commit `48cc1cbfb907aae7a73d2030c6c98d98b094d04f` also extends the Playwright content fixture with out-of-order/duplicate/unknown-date SOOP posts plus successful and failed sourcePreview responses.
Task 2 RED: Site regression run 37085773203 failed as expected because `renderPosts()` did not yet consume `normalizePostRows(item)` or emit stable post cards.
Task 2 browser RED refinement: browser run 37085773177 initially failed before the target assertion because a static HTTP server cannot directly resolve `/contents/justserver-survival`. Commit `2b72c05dab403b3aef364ac06d10ff664624aca1` changes only the test entry to the already-supported `chunbong-contents.html?id=justserver-survival` route.
Task 2 browser RED: run 37085979759 then reached the Posts UI and failed at the intended assertion: expected 5 canonical-deduplicated cards, actual 0.
Task 2 implementation: `content-page-enhancements.js` commit `5be16589a9d112ec464a57257fb1dc2605caefeb` moves lazy preview loading into the existing card; `content-page-enhancements.css` commit `fd8998726667cde8bb18c6f8f1bfd3cabc9fd203` styles the stable expanded/collapsed card; renderer commit `950e733545a2c09f511cedbfc33a4f570fe15929` makes `renderPosts()` render only `normalizePostRows(item)` as stable `article.archive-post-card` elements.
Task 2 compatibility refinement: Site regression run 37086276172 reached an older shared-UX contract requiring the linked-post runtime to retain the shared `notice-card` / `notice-toggle` / `notice-body` component vocabulary. Runtime commit `fb27396e53b9eb284f08d31c0f3cfce33200b1a9` and renderer commit `112bf1530b45db85d7643285dae4bbb083f28f93` preserve those shared classes on the same stable card without restoring sibling insertion.
Task 2 static GREEN: Site regression run 37086469399 succeeded after explicitly excluding `[data-source-external-link]` from the toggle handler in commit `ede3f6fc59c664f1b989616414ee71cc722bbd21`.
Task 2 browser refinement: browser run 37086469400 reached the successful preview flow but asserted while the card was correctly displaying its temporary `게시글 본문을 불러오는 중...` state. Test-only commit `d404493de23a26d87541b5f55b453a52f7be2692` waits for final preview/error text before asserting.
Task 2: complete (Site regression run 37086639434 → success; Chromium archive browser smoke run 37086639371 → success, including newest-first order, canonical dedupe, in-card expand/collapse/reopen, one successful preview request, external-link separation, and failure-card stability).

Task 3 RED: commit `b49037408bbd8d6c5c6a21073ace58f14676eb0c` added `tests/chunbong-post-audit-regression.mjs`; Site regression run 37086765972 failed exactly because `scripts/audit-chunbong-posts.mjs` did not exist.
Task 3 implementation: commit `13cbc4ab73c6707da575fbb8cb2dbf3ff8479b9d` added the one-shot whole-archive auditor. It validates canonical uniqueness, known/unknown date placement, date order, and placeholder-title wins; the public audit performs one list request followed by sequential detail requests and is not attached to site runtime.
Task 3 GREEN: Site regression run 37086883659 → success. Commit `483fd5427243098ecdc94e029f7f9669eeed0c06` expands the archive-browser-smoke path filters to include the post renderer, enhancement assets, audit script, and new post regression tests.
