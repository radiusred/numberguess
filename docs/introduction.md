# Introduction

numberguess is the working example for Radius Red's engineering-loop demo:
proof that a build → review → test → docs loop can run cleanly on
[Paperclip](https://github.com/radiusred/gh-codecrew), coordinated through
GitHub issues and PRs under the [CodeCrew protocol](https://github.com/radiusred/gh-codecrew/blob/main/SPEC.md),
with a small agent team holding each role: **Cody** (implementer), **Checky**
(reviewer), **Testy** (qa), **Wordy** (doc-synthesizer).

## What exists today (as of Cycle 1 / Milestone M1)

Just the core game engine: [`src/engine.js`](../src/engine.js), a pure,
zero-dependency ES module exposing `newGame` and `guess`. There is no CLI,
terminal UI, or web front end yet — cycle 1 deliberately scoped to logic
first, so the review → test → docs loop could be exercised end to end on a
small, well-bounded unit before any UI work begins.

Today you can play a full game by scripting against the engine directly (see
the [README's quick start](../README.md#quick-start)), or by reading the
suite's play-through case in `test/engine.test.js`.

## How it was built

Cycle 1 ran build → review → test → docs as three small, independently
reviewed GitHub PRs, each gated by the CodeCrew protocol (green CI, a
holder's approval, no unresolved `cc:needs-decision` gate) before merge —
review is a role/gate applied to each of those PRs, not a fourth PR of its
own:

1. **Build** — [PR #2](https://github.com/radiusred/numberguess/pull/2)
   landed `src/engine.js`.
2. **Test** — [PR #6](https://github.com/radiusred/numberguess/pull/6)
   landed the 21-test suite.
3. **Docs** — this PR: README, this introduction, and the milestone record.

The full account of what was decided along the way — including two mid-cycle
CI fixes and a re-chartering of who owns tests — is in
[`docs/milestones/1-core-engine.md`](milestones/1-core-engine.md).

## What's next

No milestone 2 charter exists yet; see [`ROADMAP.md`](../ROADMAP.md) for the
tracking table as it fills in.

## Status

| Area | Status |
|---|---|
| Engine (`src/engine.js`) | Done — reviewed, tested, all of M1-R1…R5 verified by QA |
| CLI / UI | Not started |
| Docs | Cycle 1 (this milestone) |
