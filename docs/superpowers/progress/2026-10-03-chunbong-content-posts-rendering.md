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
Task 2 browser RED refinement: browser run 37085773177 initially failed before the target assertion because a static HTTP server cannot directly resolve `/contents/justserver-survival`. Commit `2b72c05dab403b3aef364ac06d10ff664624aca1` changes only the test entry to the already-supported `chunbong-contents.html?id=justserver-survival` route. This checkpoint reruns browser RED against the actual Posts UI.
