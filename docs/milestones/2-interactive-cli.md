# M2 — Cycle 2: Interactive CLI Play-Loop

Milestone issue: [radiusred/numberguess#9](https://github.com/radiusred/numberguess/issues/9)

## Goal

Wrap the pure numberguess engine ([`src/engine.js`](../../src/engine.js)) in
an interactive readline CLI, runnable via `npm start`, without touching the
engine's I/O-free logic.

## Outcome

Delivered: a readline play-loop at [`src/cli.js`](../../src/cli.js) — pure,
exported input helpers (`parseGuess`, `feedbackFor`, `parsePlayAgain`,
`winMessage`, `seedFromEnv`) plus a main-loop that only runs under an
entry-module guard, so importing the file for tests is side-effect-free — and
a 13-test suite ([`test/cli.test.js`](../../test/cli.test.js)) covering the
helpers plus four spawn-based end-to-end runs over piped stdin. `npm start`
is wired in `package.json`; `src/engine.js` is byte-for-byte unchanged
(`git diff 17883d9 986de50 -- src/engine.js` is empty).

The build was chartered as task
[#10](https://github.com/radiusred/numberguess/issues/10) and landed as
[PR #12](https://github.com/radiusred/numberguess/pull/12), approved by
Checky at head `fbdc9d5` and rebase-merged to `main` via
`gh codecrew task finish 10`, landing as `986de50` — the rebased tip commit
on `main` (single-parent; rebase-merge, not a merge commit). `npm test`
passed 34/34 (21 engine, 13 CLI) both pre-merge and on merged `main`. QA
(Testy) verdicted all four requirements against merged `main` (`986de50`) on
2026-08-28, finding **M2-R1–R4 satisfied**.

## Requirement outcomes

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| M2-R1 | `npm start` launches an interactive session that starts a new game (default range 1–100) and repeatedly prompts the player for a guess | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453665807) on #9, 2026-08-28T14:20:50Z |
| M2-R2 | Feedback derives from the engine `RESULTS` (too low / too high / correct); invalid input (non-integer, blank, out of range) is caught and re-prompted without crashing | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666024) on #9, 2026-08-28T14:20:51Z |
| M2-R3 | On a correct guess the CLI reports the attempt count and offers to play again; `y` restarts, decline or EOF/Ctrl-D exits status 0 | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666232) on #9, 2026-08-28T14:20:52Z |
| M2-R4 | CLI lives in a new `src/cli.js` as a thin I/O layer over the unchanged, I/O-free engine; `npm start` wired in `package.json` | Satisfied | [QA verdict](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666422) on #9, 2026-08-28T14:20:53Z |

Unlike Cycle 1, this milestone's charter carries no requirement for the
record itself (no M2-R5/"doc" line in [#9](https://github.com/radiusred/numberguess/issues/9)) —
this document is delivered under the doc-synthesizer role contract rather
than a numbered milestone requirement.

## Decisions

Both decisions below are recorded in a single `**Decision:**` comment on the
task issue, made at the moment of choice during the build.

1. **Player input read through a pull-based line queue, not `rl.question`.**
   [Task #10 comment, 2026-08-28T12:49:51Z](https://github.com/radiusred/numberguess/issues/10#issuecomment-5452704767):
   a `line` listener is attached at interface creation and queues lines
   until something asks for one, rather than using `readline`'s built-in
   query/answer pairing. **Trade-off:** slightly more code, and prompts are
   written with `output.write` instead of readline's query handling.
   **Rejected:** `rl.question` — lines arriving while no question is
   pending (the normal case with piped/buffered stdin, which is exactly how
   the e2e tests and CI drive the CLI) are silently dropped by `rl.question`,
   which made scripted sessions skip inputs.

2. **Optional `NUMBERGUESS_SEED` env var for a deterministic secret.**
   [Same comment](https://github.com/radiusred/numberguess/issues/10#issuecomment-5452704767):
   `seedFromEnv` reads `NUMBERGUESS_SEED` and passes it to `newGame`,
   ignored unless it parses as an integer. **Trade-off:** one extra
   (documented) knob on the CLI's surface. **Rejected:** testing only the
   pure helpers — without a way to know the secret, the play-loop itself
   (feedback, attempt count, replay, EOF exit) would stay untested, so the
   seed hook was added specifically to let the e2e tests script a full game.

## Deviations

1. **Pre-staged `ROADMAP.md` M2 row was not on `main`; added fresh in this
   PR instead.** The task #10 dispatch expected a pre-staged M2 row in
   `ROADMAP.md` to be picked up "if it shows in your branch diff" (recorded
   in the [task's plan](https://github.com/radiusred/numberguess/issues/10)).
   The branch was cut clean from `main`, whose `ROADMAP.md` had only the
   table header, so nothing appeared in the diff — noted in
   [PR #12's description](https://github.com/radiusred/numberguess/pull/12).
   A follow-up [PR #12 comment, 2026-08-28T12:52:33Z](https://github.com/radiusred/numberguess/pull/12#issuecomment-5452730960)
   records the resolution: the row had only ever existed in the
   coordinator's clone, never on `main`; per coordinator instruction on the
   dispatch ticket (Paperclip, off-GitHub — not independently linkable here),
   Cody added the row directly to this PR as commit `fbdc9d5`, closing out
   M2-R4's roadmap bookkeeping alongside the code.

## Sources

- Milestone: [#9](https://github.com/radiusred/numberguess/issues/9)
- Task issue: [#10](https://github.com/radiusred/numberguess/issues/10)
- PR: [#12](https://github.com/radiusred/numberguess/pull/12), approved by
  [Checky's review](https://github.com/radiusred/numberguess/pull/12#pullrequestreview-5051272461),
  merged as `986de50`
- QA verdicts: [M2-R1](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453665807),
  [M2-R2](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666024),
  [M2-R3](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666232),
  [M2-R4](https://github.com/radiusred/numberguess/issues/9#issuecomment-5453666422)
