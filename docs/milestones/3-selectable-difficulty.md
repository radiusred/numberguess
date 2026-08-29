# M4 — Cycle 3: Selectable Difficulty Levels

Milestone issue: [radiusred/numberguess#15](https://github.com/radiusred/numberguess/issues/15)

## Goal

Let the player pick a difficulty before each game; each level maps to a
distinct inclusive guessing range, with Medium preserving the pre-M4 default
(1–100) exactly. No engine API change.

## Outcome

Delivered: a pre-game difficulty menu in [`src/cli.js`](../../src/cli.js) —
`DIFFICULTIES` (Easy 1-10, Medium 1-100, Hard 1-1000, frozen and exported),
`parseDifficulty` (pure, exported, mirroring `parseGuess`/`parsePlayAgain`),
and `formatDifficultyPrompt` — wired into `main` so the player is asked
before every game, including on replay, and the chosen `{min, max}` flows
into `newGame(min, max, seed)`. `src/engine.js` is untouched
(`git diff origin/main...HEAD -- src/engine.js` is empty, verified by Checky
on the merged PR). The suite grew from 34 to 45 tests (21 engine, 24 CLI).

The build was chartered as task
[#18](https://github.com/radiusred/numberguess/issues/18) and landed as
[PR #20](https://github.com/radiusred/numberguess/pull/20), rebase-merged to
`main` via `gh codecrew task finish 18` as `e8f9f7c` after Checky's approval
at head `840a1c40`. A duplicate task, issue
[#19](https://github.com/radiusred/numberguess/issues/19), was opened in
error in the same interrupted heartbeat as #18 and closed by the coordinator
with no plan, branch, or PR ever created on it — see
[Deviations](#deviations). Separately, task
[#16](https://github.com/radiusred/numberguess/issues/16) (contract-drift
reconciliation, [PR #17](https://github.com/radiusred/numberguess/pull/17),
merged `d2acc20`) landed inside this milestone's task list but maps to no
M4-Rx requirement — pure tooling, noted here for completeness, not as a
feature decision.

QA (Testy) verdicted all four requirements against merged `main` (`e8f9f7c`)
on 2026-08-29: **M4-R1–R3 satisfied**, and **M4-R4 not satisfied** — the
ROADMAP-row clause had landed, but the README `Play` section and this record
were both missing. This document, the README update, and the
`docs/introduction.md` refresh in this same PR close that gap.

## Requirement outcomes

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| M4-R1 | Pre-game difficulty prompt with ≥3 levels (Easy 1-10, Medium 1-100, Hard 1-1000); selection sets that game's inclusive bounds; Medium reproduces the current default exactly | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462419900) on #15, 2026-08-29T12:28:55Z |
| M4-R2 | Difficulty parsing/validation is a pure, exported, tested helper mirroring `parseGuess`/`parsePlayAgain`; unrecognised input re-prompts without crashing and never reaches the engine unvalidated | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462419949) on #15, 2026-08-29T12:28:56Z |
| M4-R3 | Chosen range flows through `newGame` so prompt/bounds/feedback reflect it; engine behaviour for existing ranges unchanged (no engine API change) | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462420000) on #15, 2026-08-29T12:28:57Z |
| M4-R4 | Docs: README `Play` documents difficulty selection; `docs/milestones/3-*.md` captures decisions/trade-offs; the M3 ROADMAP row lands in the first feature PR | Satisfied — ROADMAP clause landed in [PR #20](https://github.com/radiusred/numberguess/pull/20); README/record delivered by this PR — pending re-verdict | ROADMAP clause: [QA verdict](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462420053) on #15, 2026-08-29T12:28:58Z (found the row present, README/record absent). README/record: this PR |

## Decisions

1. **Difficulty encoded as a frozen, exported table (`DIFFICULTIES`) rather
   than inline constants in `main`.**
   [Task #18's plan](https://github.com/radiusred/numberguess/issues/18):
   each entry is `{key, name, min, max}`, and both `parseDifficulty` and
   `formatDifficultyPrompt` derive from the same table, so the menu text and
   the accepted answers can't drift apart. **Trade-off:** one more exported
   symbol on the CLI's public surface. **Rejected:** hardcoding the menu
   string and the accepted-answer set separately — the M2 CLI already
   established the pattern of deriving prompts from a single source of
   truth (`parseGuess`'s bounds messages), and duplicating it here would
   reopen the drift class that pattern exists to close.

2. **`parseDifficulty` mirrors `parseGuess`/`parsePlayAgain`'s
   `{ok, value|message}` shape exactly.**
   [Task #18's plan](https://github.com/radiusred/numberguess/issues/18):
   a recognised choice (menu number `1`/`2`/`3` or level name,
   case-insensitive, trimmed) returns `{ok: true, value: <difficulty>}`;
   anything else returns `{ok: false, message}`, so the same re-prompt loop
   shape used for guesses applies unchanged to difficulty selection, and the
   engine is never called with an unvalidated range. **Trade-off:** none
   material — this is the existing helper contract, reused rather than
   redesigned. **Rejected:** throwing on invalid input and catching it in
   `main` — the existing helpers already established re-prompt-via-return-
   value as the CLI's error-handling convention; introducing exceptions here
   would be a second, inconsistent pattern for the same class of problem.

3. **Medium's bounds fixed at exactly 1–100 to reproduce the pre-M4
   default byte-for-byte, and covered by a dedicated unit assertion.**
   [Task #18's plan](https://github.com/radiusred/numberguess/issues/18) and
   [PR #20's description](https://github.com/radiusred/numberguess/pull/20):
   `DIFFICULTIES`'s Medium entry is asserted `1..100` in the unit suite
   specifically to guard M4-R1's "reproduce the current default" clause, and
   the e2e suite kept asserting the literal "between 1 and 100" opening line
   under Medium. **Trade-off:** none — this is the requirement, not a
   choice between alternatives. **Rejected:** n/a.

4. **The M3 ROADMAP-row clause of M4-R4 points at milestone issue #11 ("M3:
   M2 — Interactive CLI"), not at this milestone (#15, "M4").**
   [Task #18's Decision comment](https://github.com/radiusred/numberguess/issues/18#issuecomment-5462274418):
   milestone issues #9 ("M2") and #11 ("M3") both charter the same
   interactive-CLI scope — #11 re-charters #9 — so the ROADMAP row added in
   [PR #20](https://github.com/radiusred/numberguess/pull/20) for #11 reads
   near-identically to the pre-existing M2 row for #9. This is exactly what
   M4-R4's requirement text asked for (a row for "M3"), not a mistake in
   the feature build. **Trade-off:** two adjacent ROADMAP rows describe one
   delivered milestone. **Rejected:** (a) silently omitting the row — M4-R4
   calls for it explicitly; (b) editing or merging the pre-existing M2 row —
   out of scope for the feature task and would obscure the audit trail.
   Flagged to the coordinator to reconcile if desired; not a blocking gate.

5. **This milestone's own ROADMAP row (`M4 | ... | #15 | ...`) is added by
   this PR, not carried over from an earlier task.** No prior task in this
   milestone's task list (#16, #18, #19) was asked to add a row for #15
   itself — M4-R4's ROADMAP clause names only the #11/"M3" row (Decision 4),
   and this task's own dispatch said to verify that row and stop. This
   record adds the missing #15 row anyway (`[Done](3-selectable-difficulty.md)`),
   under the doc-synthesizer contract's unconditional obligation to flip the
   milestone's ROADMAP row to `Done` in the same PR as the record — "no
   other seat will." **Trade-off:** goes slightly beyond the letter of this
   task's dispatch, which only asked for verification. **Rejected:** leaving
   #15 permanently unrepresented in `ROADMAP.md` — every other closed
   milestone (M1 aside, which predates the table) has a row, and skipping
   this one because the dispatch didn't spell it out would leave the table
   silently incomplete rather than recording an explicit choice.

## Deviations

1. **A duplicate build task (#19) was opened and closed without work.**
   [Coordinator comment on #19, 2026-08-29T11:50:55Z](https://github.com/radiusred/numberguess/issues/19#issuecomment-5462259728):
   #18 and #19 were both auto-created around 11:48Z in the same interrupted
   heartbeat, describing the same M4 feature. #18 carried the correct plan
   and was treated as canonical; #19 was closed as a duplicate before any
   plan, branch, or PR existed on it. No requirement or code was affected —
   noted here only because #19 appears in the milestone's task list and its
   contents (a placeholder "Goal: _To be written._" body) would otherwise
   read as an unexplained gap.

2. **The PR body's verification command needed a documentation fix before
   approval, though the underlying check was always correct.**
   Checky's [first](https://github.com/radiusred/numberguess/pull/20#pullrequestreview-5058030340)
   and [second](https://github.com/radiusred/numberguess/pull/20#pullrequestreview-5058035926)
   CHANGES_REQUESTED reviews on PR #20: the PR description originally
   documented `git diff main -- src/engine.js` as proof the engine was
   untouched; run verbatim in a fresh review checkout (which has
   `origin/main` but no local `main` branch), that command fails with
   `fatal: bad revision 'main'` rather than confirming anything. Both
   reviews asked for the working form, `git diff origin/main...HEAD --
   src/engine.js`, which Checky's [APPROVED
   review](https://github.com/radiusred/numberguess/pull/20#pullrequestreview-5058047689)
   confirmed produces empty output. **Why recorded as a deviation rather
   than a decision:** no alternative was weighed — the command was simply
   wrong as written and was corrected to the form Checky verified. The
   underlying claim (engine unchanged) was true throughout; only the
   documented reproduction command was defective.

## Sources

- Milestone: [#15](https://github.com/radiusred/numberguess/issues/15)
- Task issues: [#18](https://github.com/radiusred/numberguess/issues/18)
  (feature), [#19](https://github.com/radiusred/numberguess/issues/19)
  (duplicate, closed unworked), [#16](https://github.com/radiusred/numberguess/issues/16)
  (unrelated tooling, same milestone task list), [#21](https://github.com/radiusred/numberguess/issues/21)
  (this record)
- PRs: [#20](https://github.com/radiusred/numberguess/pull/20) (feature,
  merged `e8f9f7c`), [#17](https://github.com/radiusred/numberguess/pull/17)
  (tooling, merged `d2acc20`)
- QA verdicts: [M4-R1](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462419900),
  [M4-R2](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462419949),
  [M4-R3](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462420000),
  [M4-R4](https://github.com/radiusred/numberguess/issues/15#issuecomment-5462420053)
