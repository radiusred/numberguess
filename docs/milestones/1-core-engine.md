# M1 — Cycle 1: Core Number-Guessing Engine

Milestone issue: [radiusred/numberguess#3](https://github.com/radiusred/numberguess/issues/3)

## Goal

Cycle 1 of the engineering-loop demo: a small, reviewable, well-tested
number-guessing game, delivered as pure game-logic first (engine), then
tests, then docs — proving the build → review → test → docs loop runs
cleanly end to end.

## Outcome

Delivered: a pure, zero-dependency numberguess engine
([`src/engine.js`](../../src/engine.js), `newGame`/`guess`) and a 21-test
suite (`test/engine.test.js`), each landed as its own small, independently
reviewed GitHub PR. QA re-verified all requirements against merged `main`
(commit `17883d9`) on 2026-08-28; every requirement is satisfied, closing the
milestone once this document merges.

## Requirement outcomes

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| M1-R1 | `newGame(min=1, max=100, seed?)` returns a fresh, in-range state; seeded secrets are deterministic | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366) on #3, 2026-08-28T00:58:37Z |
| M1-R2 | `guess(state, n)` returns a new, immutable state with correct `result`/`attempts`; correct guess sets `status: 'won'` | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366) on #3, 2026-08-28T00:58:37Z |
| M1-R3 | Input validation: `TypeError`/`RangeError`/`Error` on the documented invalid inputs | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366) on #3, 2026-08-28T00:58:37Z |
| M1-R4 | Pure module: no I/O, no UI, no runtime deps, no build step; Node ESM at `src/engine.js`, exported as package root | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366) on #3, 2026-08-28T00:58:37Z |
| M1-R5 | Automated tests (implementer-authored, QA-verdicted) cover R1–R3 including determinism, immutability, attempt counting, and every error path | Satisfied — after re-charter ([Decision 1](#decisions)) and a second PR ([PR #6](https://github.com/radiusred/numberguess/pull/6)) | [QA verdict](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366) on #3, 2026-08-28T00:58:37Z |
| M1-R6 | Milestone record synthesized to `docs/milestones/1-core-engine.md` | Satisfied by this document | This PR |

QA's [first pass](https://github.com/radiusred/numberguess/issues/3#issuecomment-5446807346)
(2026-08-28T00:23:34Z) found M1-R1–R4 satisfied and M1-R5 not yet satisfied —
not because the tests were wrong, but because they couldn't be published (see
[Decision 1](#decisions)). The
[second pass](https://github.com/radiusred/numberguess/issues/3#issuecomment-5447045366),
after PR #6 merged, confirmed all six.

## Decisions

Each decision below is a `**Decision:**` comment recorded on the issue or PR
cited; trade-offs and rejected alternatives are as recorded, not
reconstructed.

1. **Tests re-chartered from qa to the implementer.** The milestone
   originally assigned M1-R5 to qa (Testy). Testy wrote a suite (8 tests,
   later superseded) but could not publish it: the `radiusred-testy` App has
   `contents: read`, and GitHub rejected branch publication with `HTTP 403`
   — [QA verdict on #3, 2026-08-28T00:23:34Z](https://github.com/radiusred/numberguess/issues/3#issuecomment-5446807346),
   which names the rejected fix explicitly: granting `radiusred-testy`
   `contents: write` so qa could push directly. That was **rejected** in
   favor of re-chartering M1-R5 to the implementer role instead, on the
   operator's instruction that "the qa seat never writes code" (Paperclip
   RAD-4226, 2026-08-28T00:35:28Z), keeping qa's GitHub scope read-only.
   **Trade-off:** the implementer (Cody) — who already had the write access
   the task needed — authored the suite fresh rather than reusing Testy's
   draft, because Testy's local commit `9de3f2e` was never reachable from any
   clone or remote branch (see Decision 6). Recorded on the milestone as the
   requirement footnote "_Re-chartered 2026-08-28: qa never authors tests —
   Bossy_" ([#3](https://github.com/radiusred/numberguess/issues/3)) and
   implemented via Paperclip RAD-4226 (coordinator comment,
   2026-08-28T00:42:39Z) — noted here because the full rationale lives split
   across the qa verdict, the operator instruction, and the milestone
   footnote, with no single GitHub comment carrying all three.

2. **No tests in the engine PR.** [PR #2's description](https://github.com/radiusred/numberguess/pull/2)
   records the decision to ship `src/engine.js` without tests in the same
   PR, deferring them to a following step of cycle 1 — deterministic seeding
   was included specifically so those tests would be reliable once written.
   No rejected alternative was recorded for this one.

3. **Added a CI workflow after `task finish` refused `NO_CHECKS`.**
   [PR #2 comment, 2026-08-27T23:13:06Z](https://github.com/radiusred/numberguess/pull/2#issuecomment-5446324073):
   the merge gate requires at least one CI check on the PR (SPEC §8), so a
   syntax-check + smoke-test workflow was added. **Trade-off:** pushing the
   new workflow dismissed Checky's existing approval as stale, forcing a
   re-review. **Rejected:** `task finish --bypass` — reserved for when
   GitHub won't count an *existing* approval, not for waiving a review that
   never happened against the new head; the implementer does not waive their
   own review.

4. **Fixed the CI test-detector bug by running `node --test` unconditionally**
   rather than repairing the per-glob check.
   [PR #2 comment, 2026-08-28T00:07:01Z](https://github.com/radiusred/numberguess/pull/2#issuecomment-5446692545),
   responding to
   [Checky's changes-requested review](https://github.com/radiusred/numberguess/pull/2#pullrequestreview-5046461411)
   (2026-08-27T23:15:48Z): under `bash -e -o pipefail`, `ls test/*.js
   test/*.mjs 2>/dev/null | grep -q .` fails when only one extension has
   matches, so a `.js`-only or `.mjs`-only suite silently skipped
   `node --test` entirely — a real risk to M1-R5 ever actually running.
   **Trade-off:** the simpler fix relies on `node --test` exiting `0` when
   no test files exist, which holds on the pinned Node version (verified).
   **Rejected:** `compgen -G`-style either-extension detection — more moving
   parts for the same defect class.

5. **Rewrote branch history to satisfy two org rulesets.**
   [PR #2 comment, 2026-08-28T00:14:28Z](https://github.com/radiusred/numberguess/pull/2#issuecomment-5446746639):
   `task finish 4` refused on GitHub base-branch policy even with an approval
   and green CI, because (a) a required "Lint commit messages" status check
   had nothing reporting it, and (b) the original engine commit was
   authored as plain `Cody <cody@radiusred.ai>` — unattributed to any GitHub
   account, tripping `require_extra_approval_for_unattributed_changes`. Fixed
   by adding a hand-rolled commit-message-format workflow
   ([`.github/workflows/commitlint.yml`](../../.github/workflows/commitlint.yml))
   and rewriting the commit as `radiusred-cody[bot]`. **Trade-off:** the
   force-push dismissed Checky's approval a third time, requiring a third
   review pass (the tree was verified byte-identical to the previously
   approved state). **Rejected:** reporting the required check via the
   Checks API without a real workflow behind it (not "on the record"); asking
   to amend the org rulesets (reasonable policy, satisfiable in-repo).

6. **Tests authored fresh instead of using Testy's handoff commit.**
   [PR #6's description](https://github.com/radiusred/numberguess/pull/6):
   Testy's prepared commit `9de3f2e` was unreachable from the implementer's
   clone and absent from every remote branch, so the 21-test suite was
   written fresh against the same coverage spec (seed determinism,
   play-through, transitions, immutability, every error path) rather than
   reusing Testy's draft. **Trade-off:** loses Testy's exact assertions;
   keeps the coverage contract. **Rejected:** waiting on Testy's workspace to
   make the commit reachable — the dispatch named fresh authorship as the
   fallback.

## Deviations

1. **Build ran ahead of the milestone record.** PR #2 was built and approved
   by Checky *before* milestone #3 existed:
   [issue #4 comment, 2026-08-27T23:06:43Z](https://github.com/radiusred/numberguess/issues/4#issuecomment-5446276711)
   and [2026-08-27T23:09:10Z](https://github.com/radiusred/numberguess/issues/4#issuecomment-5446295242).
   **Why:** the coordinator App (`radiusred-bossy`) had zero installations on
   the org and so could not open the milestone charter until the org admin
   completed the install (Paperclip RAD-4226, "installation complete now",
   2026-08-27T22:59:31Z). Once #3 and #4 were opened, PR #2 was reconciled
   under them retroactively; no requirement text changed as a result.

2. **Tests landed as their own PR instead of riding PR #2.** [Issue #5's
   dispatch comment, 2026-08-28T00:41:26Z](https://github.com/radiusred/numberguess/issues/5#issuecomment-5446934162)
   records that the plan had been for tests to ride PR #2, but PR #2 (the
   engine) merged at 00:18Z before the suite was ready. **Why:** once merged,
   there was no open PR left to ride, so the tests were chartered as task #5
   and landed as [PR #6](https://github.com/radiusred/numberguess/pull/6)
   against `main` instead.

## Sources

- Milestone: [#3](https://github.com/radiusred/numberguess/issues/3)
- Task issues: [#4](https://github.com/radiusred/numberguess/issues/4) (engine), [#5](https://github.com/radiusred/numberguess/issues/5) (tests)
- PRs: [#2](https://github.com/radiusred/numberguess/pull/2) (engine), [#6](https://github.com/radiusred/numberguess/pull/6) (tests)
