# Introduction

numberguess is the working example for Radius Red's engineering-loop demo:
proof that a build → review → test → docs loop can run cleanly on
[Paperclip](https://github.com/radiusred/gh-codecrew), coordinated through
GitHub issues and PRs under the [CodeCrew protocol](https://github.com/radiusred/gh-codecrew/blob/main/SPEC.md),
with a small agent team holding each role: **Cody** (implementer), **Checky**
(reviewer), **Testy** (qa), **Wordy** (doc-synthesizer).

## What exists today (as of Cycle 3 / Milestone M4)

The core game engine, [`src/engine.js`](../src/engine.js) — a pure,
zero-dependency ES module exposing `newGame` and `guess` — plus an
interactive terminal CLI, [`src/cli.js`](../src/cli.js), that plays it via
`npm start`. Before each game the CLI asks the player to pick a difficulty
(Easy 1-10, Medium 1-100, Hard 1-1000; Medium reproduces the original
default) through a pure, exported, tested helper, and the chosen range flows
into the engine unchanged. The CLI is a thin readline layer: it validates
input, prints feedback, tracks replay, and never touches the engine's
internals — the engine is byte-for-byte unchanged since Cycle 1. There is no
web front end yet.

Today you can play a full game interactively with `npm start`, choosing a
difficulty each time (see the [README's Play section](../README.md#play)),
or script against the engine directly (see
[Programmatic usage](../README.md#programmatic-usage)).

## How it was built

Cycle 1 delivered the engine; Cycle 2 delivered the CLI on top of it; Cycle 3
added selectable difficulty. Each
cycle ran build → review → test → docs as small, independently reviewed
GitHub PRs, each gated by the CodeCrew protocol (green CI, a holder's
approval, no unresolved `cc:needs-decision` gate) before merge — review is a
role/gate applied to each PR, not a PR of its own:

**Cycle 1 (M1):**
1. **Build** — [PR #2](https://github.com/radiusred/numberguess/pull/2)
   landed `src/engine.js`.
2. **Test** — [PR #6](https://github.com/radiusred/numberguess/pull/6)
   landed the 21-test engine suite.
3. **Docs** — [PR #7](https://github.com/radiusred/numberguess/pull/7):
   README, this introduction, and the M1 milestone record.

**Cycle 2 (M2):**
1. **Build + test** — [PR #12](https://github.com/radiusred/numberguess/pull/12)
   landed `src/cli.js`, the 13-test CLI suite, and the `npm start` wiring in
   one reviewed PR (task [#10](https://github.com/radiusred/numberguess/issues/10)).
2. **Docs** — [PR #13](https://github.com/radiusred/numberguess/pull/13):
   README, this introduction, and the M2 milestone record.

**Cycle 3 (M4 — milestone [#15](https://github.com/radiusred/numberguess/issues/15), "Selectable difficulty levels"):**
1. **Build + test** — [PR #20](https://github.com/radiusred/numberguess/pull/20)
   landed the difficulty menu, `parseDifficulty`/`formatDifficultyPrompt`,
   and the range flowing through `newGame`, growing the suite to 45 tests
   (task [#18](https://github.com/radiusred/numberguess/issues/18)).
2. **Docs** — this PR: README, this introduction, and the M4 milestone
   record (task [#21](https://github.com/radiusred/numberguess/issues/21)).

(A separate tooling task in the same milestone,
[PR #17](https://github.com/radiusred/numberguess/pull/17), reconciled the
`roles/` contracts to v1.0.3 — process hygiene, not a numbered milestone
requirement.)

The full account of what was decided along the way in each cycle —
including two mid-cycle CI fixes and a re-chartering of who owns tests in
M1, the readline input-queue and seed-hook decisions in M2, and the
difficulty-table and ROADMAP-numbering decisions in M4 — is in
[`docs/milestones/1-core-engine.md`](milestones/1-core-engine.md),
[`docs/milestones/2-interactive-cli.md`](milestones/2-interactive-cli.md) and
[`docs/milestones/3-selectable-difficulty.md`](milestones/3-selectable-difficulty.md).

## What's next

No further milestone charter exists yet; see [`ROADMAP.md`](../ROADMAP.md)
for the tracking table as it fills in.

## Status

| Area | Status |
|---|---|
| Engine (`src/engine.js`) | Done — reviewed, tested, all of M1-R1…R5 verified by QA |
| CLI (`src/cli.js`, `npm start`) | Done — reviewed, tested, all of M2-R1…R4 verified by QA |
| Selectable difficulty | Done — reviewed, tested, M4-R1…R3 verified by QA; M4-R4 (docs) delivered by this PR, pending re-verdict |
| Web / other front ends | Not started |
| Docs | Cycle 3 (this milestone) |
