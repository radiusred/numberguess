# numberguess

A pure, dependency-free game engine for a number-guessing game. `src/engine.js`
is a single Node ESM module with no I/O and no UI — just deterministic state
transitions you can drive from a script, a CLI, or a future front end.

This is the cycle-1 deliverable of Radius Red's [engineering-loop demo](docs/introduction.md):
a small four-agent team (build → review → test → docs) shipping a real feature
through reviewed GitHub PRs. The full record of how this milestone was built —
decisions, trade-offs, rejected alternatives — is in
[`docs/milestones/1-core-engine.md`](docs/milestones/1-core-engine.md).

## Install & run

Zero runtime dependencies, no build step.

```bash
git clone https://github.com/radiusred/numberguess.git
cd numberguess
npm test
```

`npm test` runs `node --test`, which discovers and runs everything under
`test/` (currently 21 tests covering the full public API — see
[Tests](#tests) below).

## Quick start

The package isn't published, so import the module by path:

```js
import { newGame, guess, RESULTS } from './src/engine.js';

let state = newGame(1, 100, 42); // seeded, so the secret is reproducible
let result;

do {
  const attempt = Math.floor((state.min + state.max) / 2); // simple midpoint strategy
  ({ state, result } = guess(state, attempt));
  console.log(`guessed ${attempt} -> ${result}`);
} while (result !== RESULTS.CORRECT);

console.log(`won in ${state.attempts} attempts`);
```

Drop the seed (`newGame(1, 100)`) for a random secret each time.

## API

### `newGame(min = 1, max = 100, seed?) -> GameState`

Starts a new game with a secret integer in `[min, max]` (inclusive).

- `min` — inclusive lower bound. Must be an integer.
- `max` — inclusive upper bound. Must be an integer greater than `min`.
- `seed` — optional integer. When given, the secret is chosen deterministically
  (a seeded [mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
  PRNG) — the same seed always produces the same secret. When omitted, the
  secret is chosen with `Math.random`.

Returns a `GameState`:

```ts
{ min: number, max: number, secret: number, attempts: 0, status: 'playing' }
```

Throws:
- `TypeError` — `min` or `max` is not an integer, or `seed` is provided and is
  not an integer.
- `RangeError` — `min >= max`.

### `guess(state, n) -> { state, result, attempts }`

Evaluates a guess against a game state. Pure and immutable: the input `state`
is never mutated, and `guess` returns a **new** state object — so a prior
state can always be replayed.

- `state` — a `GameState` from `newGame` (or a previous `guess` call).
- `n` — the guessed integer. Must be within `[state.min, state.max]`.

Returns:

```ts
{
  state: GameState,                              // new state, attempts incremented
  result: 'too_low' | 'too_high' | 'correct',    // also available as RESULTS
  attempts: number,                               // same as state.attempts
}
```

A correct guess sets `state.status` to `'won'`.

Throws:
- `TypeError` — `state` isn't a valid game state, or `n` is not an integer.
- `RangeError` — `n` is outside `[state.min, state.max]`.
- `Error` — the game is already won (`state.status !== 'playing'`); start a
  new game instead of continuing to guess.

### `RESULTS`

A frozen object exposing the three feedback values so callers don't need to
hardcode strings:

```js
{ TOO_LOW: 'too_low', TOO_HIGH: 'too_high', CORRECT: 'correct' }
```

## Tests

```bash
npm test
```

Runs the full suite via `node --test` (`test/engine.test.js`): seed
determinism, a full play-through with attempt counting, `too_low`/`too_high`
feedback, state immutability, and every documented error path for both
`newGame` and `guess`.

## License

See [LICENSE](LICENSE).
