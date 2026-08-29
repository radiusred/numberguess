# numberguess

A number-guessing game: a pure, dependency-free engine (`src/engine.js`) plus
an interactive terminal CLI (`src/cli.js`) that plays it. The engine is a
single Node ESM module with no I/O and no UI — just deterministic state
transitions you can drive from a script, the CLI, or a future front end.

This is the cycle-1, cycle-2 and cycle-3 deliverable of Radius Red's
[engineering-loop demo](docs/introduction.md): a small four-agent team
(build → review → test → docs) shipping real features through reviewed
GitHub PRs. The full record of how each milestone was built — decisions,
trade-offs, rejected alternatives — is in
[`docs/milestones/1-core-engine.md`](docs/milestones/1-core-engine.md),
[`docs/milestones/2-interactive-cli.md`](docs/milestones/2-interactive-cli.md)
and
[`docs/milestones/4-selectable-difficulty.md`](docs/milestones/4-selectable-difficulty.md).

## Install & run

Zero runtime dependencies, no build step.

```bash
git clone https://github.com/radiusred/numberguess.git
cd numberguess
npm start
```

`npm start` launches the interactive CLI — see [Play](#play) below. To run
the test suite instead:

```bash
npm test
```

`npm test` runs `node --test`, which discovers and runs everything under
`test/` (currently 45 tests: 21 engine, 24 CLI — see [Tests](#tests) below).

## Play

```bash
npm start
```

Before each game, choose a difficulty:

```
Choose a difficulty:
  1) Easy (1-10)
  2) Medium (1-100)
  3) Hard (1-1000)
Difficulty:
```

Answer with the menu number (`1`/`2`/`3`) or the level name
(`easy`/`medium`/`hard`, case-insensitive, whitespace-trimmed). Medium is
the original default range (1–100), so choosing it reproduces the
pre-difficulty behaviour exactly. An unrecognised answer re-prints a
friendly message and re-asks — it never reaches the game engine unvalidated.

Once a difficulty is chosen, the game starts with that inclusive range and
prompts `Your guess: ` in a loop:

```
Choose a difficulty:
  1) Easy (1-10)
  2) Medium (1-100)
  3) Hard (1-1000)
Difficulty: 1
I'm thinking of a number between 1 and 10. Can you guess it?
Your guess: 5
Too low!
Your guess: 8
Too high!
Your guess: 7
Correct! You got it in 3 attempts.
Play again? (y/n) n
Thanks for playing!
```

Choosing `y`/`yes` to "Play again?" asks for a difficulty afresh — each game
can be a different level.

- An unrecognised difficulty prints a friendly message and re-asks; it never
  starts a game with an unvalidated range.
- Feedback after each guess is `Too low!`, `Too high!`, or the win message.
- Bad input (blank, non-integer, or out of range) prints a friendly message
  and re-prompts — it never crashes the process.
- On a correct guess, `Play again? (y/n)` — `y`/`yes` starts a fresh game
  (asking for difficulty again first); anything else, or EOF/Ctrl-D at any
  prompt (including the difficulty prompt), exits cleanly with status 0.

For a deterministic secret (useful for scripting or testing), set
`NUMBERGUESS_SEED` to an integer:

```bash
NUMBERGUESS_SEED=1 npm start
```

The CLI (`src/cli.js`) is a thin readline layer over the engine's `newGame`
and `guess` — the engine itself is untouched by the CLI.

## Programmatic usage

To drive the engine yourself instead of playing via the CLI — the package
isn't published, so import the module by path:

```js
import { newGame, guess, RESULTS } from './src/engine.js';

let state = newGame(1, 100, 42); // seeded, so the secret is reproducible
let lo = state.min;
let hi = state.max;
let result;

do {
  // guess() doesn't narrow state.min/state.max itself, so the caller tracks
  // its own search bounds and narrows them from each result.
  const attempt = Math.floor((lo + hi) / 2);
  ({ state, result } = guess(state, attempt));
  console.log(`guessed ${attempt} -> ${result}`);
  if (result === RESULTS.TOO_LOW) lo = attempt + 1;
  else if (result === RESULTS.TOO_HIGH) hi = attempt - 1;
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
- `TypeError` — `state` is nullish or has `status === undefined`, or `n` is
  not an integer. This check is narrow: it does not validate the rest of
  `state`'s shape, so a malformed-but-`status`-bearing object (e.g.
  `{ status: 'playing' }`, missing `min`/`max`/`secret`/`attempts`) is
  accepted and produces garbage results (e.g. `attempts: NaN`) rather than
  throwing. Always pass a `state` returned by `newGame` or a previous
  `guess` call.
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

Runs the full suite via `node --test`:

- `test/engine.test.js` (21 tests) — seed determinism, a full play-through
  with attempt counting, `too_low`/`too_high` feedback, state immutability,
  and every documented error path for both `newGame` and `guess`.
- `test/cli.test.js` (24 tests) — unit tests for the CLI's pure input
  helpers, including `parseDifficulty`, `formatDifficultyPrompt` and the
  `DIFFICULTIES` table (Medium fixed at 1–100), plus spawn-based end-to-end
  runs over piped stdin covering a full game at each difficulty, bad-input
  and unrecognised-difficulty re-prompts, a fresh difficulty prompt on
  replay, and clean exit on EOF at the difficulty prompt, the first guess
  prompt, and mid-game.

## License

See [LICENSE](LICENSE).
