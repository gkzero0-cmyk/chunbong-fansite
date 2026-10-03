# SDD ledger — plan: docs/superpowers/plans/2026-10-03-chunbong-content-posts-rendering.md

Pre-flight: Task 1 produces postCanonicalKey/mergePostRows/normalizePostRows; Tasks 2 and 3 consume normalizePostRows. Task 4 consumes the asset paths changed in Task 2. No interface conflicts found.

Task 1: Ruling: open a draft PR before Task 4 solely to execute pull-request CI because this environment cannot clone GitHub or run the repository locally — preserves required RED/GREEN evidence without changing the implementation scope — cost if wrong: an implementation PR becomes visible earlier than planned, but remains draft and unmergeable until verification.
