# SDD ledger — plan: docs/superpowers/plans/2026-10-03-chunbong-content-posts-rendering.md

Pre-flight: Task 1 produces postCanonicalKey/mergePostRows/normalizePostRows; Tasks 2 and 3 consume normalizePostRows. Task 4 consumes the asset paths changed in Task 2. No interface conflicts found.

Task 1: Ruling: open a draft PR before Task 4 solely to execute pull-request CI because this environment cannot clone GitHub or run the repository locally — preserves required RED/GREEN evidence without changing the implementation scope — cost if wrong: an implementation PR becomes visible earlier than planned, but remains draft and unmergeable until verification.

Task 1 RED: Site regression run 37085121705 failed at `tests/chunbong-post-normalization-regression.mjs` because `postCanonicalKey` was undefined; prior regressions reached that test successfully.
Task 1 implementation: commit `4d4a2e8cb5e7e1a4d29e987daf26e5c46090cc97` added the minimal normalization helpers and exports. A user-authored checkpoint commit follows so pull-request CI executes against the bot-produced implementation commit.
