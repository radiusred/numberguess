/**
 * numberguess core engine — pure game logic, no I/O.
 *
 * Public API:
 *   newGame(min = 1, max = 100, seed?) -> GameState
 *   guess(state, n)                    -> { state, result, attempts }
 *
 * State is treated as immutable: `guess` returns a new state object and
 * never mutates its input, so callers (and tests) can replay any sequence.
 */

export const RESULTS = Object.freeze({
  TOO_LOW: 'too_low',
  TOO_HIGH: 'too_high',
  CORRECT: 'correct',
});

/**
 * Deterministic PRNG (mulberry32). Returns a function yielding floats in
 * [0, 1). Same seed -> same sequence, on any platform.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Start a new game with a secret integer in [min, max].
 *
 * @param {number} [min=1]  inclusive lower bound (integer)
 * @param {number} [max=100] inclusive upper bound (integer, > min)
 * @param {number} [seed]   optional integer seed for a deterministic secret
 * @returns {{min: number, max: number, secret: number, attempts: number, status: 'playing'}}
 * @throws {TypeError} if min, max, or seed is not an integer
 * @throws {RangeError} if min >= max
 */
export function newGame(min = 1, max = 100, seed = undefined) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError(`min and max must be integers, got min=${min}, max=${max}`);
  }
  if (min >= max) {
    throw new RangeError(`min must be less than max, got min=${min}, max=${max}`);
  }
  if (seed !== undefined && !Number.isInteger(seed)) {
    throw new TypeError(`seed must be an integer when provided, got ${seed}`);
  }
  const random = seed === undefined ? Math.random : mulberry32(seed);
  const secret = min + Math.floor(random() * (max - min + 1));
  return { min, max, secret, attempts: 0, status: 'playing' };
}

/**
 * Evaluate a guess against a game state.
 *
 * @param {ReturnType<typeof newGame>} state
 * @param {number} n the guessed integer, within [state.min, state.max]
 * @returns {{state: object, result: 'too_low'|'too_high'|'correct', attempts: number}}
 *   `state` is a new object with the attempt counted and, on a correct
 *   guess, `status` set to 'won'.
 * @throws {TypeError} if n is not an integer
 * @throws {RangeError} if n is outside [state.min, state.max]
 * @throws {Error} if the game is already won
 */
export function guess(state, n) {
  if (state == null || state.status === undefined) {
    throw new TypeError('guess() requires a game state from newGame()');
  }
  if (state.status !== 'playing') {
    throw new Error(`game is already over (status: ${state.status}); start a newGame()`);
  }
  if (!Number.isInteger(n)) {
    throw new TypeError(`guess must be an integer, got ${n}`);
  }
  if (n < state.min || n > state.max) {
    throw new RangeError(`guess must be between ${state.min} and ${state.max}, got ${n}`);
  }
  const attempts = state.attempts + 1;
  const result =
    n < state.secret ? RESULTS.TOO_LOW : n > state.secret ? RESULTS.TOO_HIGH : RESULTS.CORRECT;
  const status = result === RESULTS.CORRECT ? 'won' : 'playing';
  return { state: { ...state, attempts, status }, result, attempts };
}
