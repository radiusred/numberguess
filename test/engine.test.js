/**
 * Engine test suite (M1-R5).
 *
 * Covers: seed determinism (mulberry32), full play-through with attempt
 * counting, too_low/too_high feedback, state immutability, and every
 * documented error path of newGame() and guess().
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, guess, RESULTS } from '../src/engine.js';

/**
 * Find a seed whose secret lies strictly inside (min, max), so both a
 * too-low and a too-high guess exist. Deterministic: the engine's PRNG is
 * seeded, so the first matching seed is stable across runs and platforms.
 */
function seedWithInteriorSecret(min, max) {
  for (let seed = 0; seed < 1000; seed++) {
    const { secret } = newGame(min, max, seed);
    if (secret > min && secret < max) return seed;
  }
  assert.fail('no seed in 0..999 produced an interior secret');
}

describe('RESULTS constants', () => {
  test('exposes the three feedback values and is frozen', () => {
    assert.deepEqual(RESULTS, {
      TOO_LOW: 'too_low',
      TOO_HIGH: 'too_high',
      CORRECT: 'correct',
    });
    assert.ok(Object.isFrozen(RESULTS));
  });
});

describe('newGame — seed determinism', () => {
  test('same seed produces the same secret every time', () => {
    for (const seed of [0, 1, 42, 2 ** 31 - 1, -7]) {
      const a = newGame(1, 100, seed);
      const b = newGame(1, 100, seed);
      assert.equal(a.secret, b.secret, `seed ${seed} not deterministic`);
    }
  });

  test('seeded secrets always land within [min, max] and are integers', () => {
    for (let seed = 0; seed < 200; seed++) {
      const { secret } = newGame(10, 20, seed);
      assert.ok(Number.isInteger(secret), `seed ${seed}: secret ${secret} not an integer`);
      assert.ok(secret >= 10 && secret <= 20, `seed ${seed}: secret ${secret} out of [10, 20]`);
    }
  });

  test('different seeds produce more than one distinct secret', () => {
    const secrets = new Set();
    for (let seed = 0; seed < 50; seed++) {
      secrets.add(newGame(1, 1000, seed).secret);
    }
    assert.ok(secrets.size > 1, 'a seed sweep should not collapse to a single secret');
  });

  test('unseeded games still respect the bounds', () => {
    for (let i = 0; i < 50; i++) {
      const { secret } = newGame(1, 10);
      assert.ok(Number.isInteger(secret) && secret >= 1 && secret <= 10);
    }
  });

  test('initial state shape: attempts 0, status playing, bounds recorded', () => {
    const state = newGame(5, 15, 3);
    assert.equal(state.min, 5);
    assert.equal(state.max, 15);
    assert.equal(state.attempts, 0);
    assert.equal(state.status, 'playing');
  });
});

describe('guess — feedback transitions', () => {
  test('guess below the secret reports too_low, above reports too_high', () => {
    const seed = seedWithInteriorSecret(1, 100);
    const start = newGame(1, 100, seed);

    const low = guess(start, start.secret - 1);
    assert.equal(low.result, RESULTS.TOO_LOW);
    assert.equal(low.attempts, 1);
    assert.equal(low.state.status, 'playing');

    const high = guess(start, start.secret + 1);
    assert.equal(high.result, RESULTS.TOO_HIGH);
    assert.equal(high.attempts, 1);
    assert.equal(high.state.status, 'playing');
  });

  test('guessing the secret reports correct and marks the game won', () => {
    const start = newGame(1, 100, 42);
    const { state, result, attempts } = guess(start, start.secret);
    assert.equal(result, RESULTS.CORRECT);
    assert.equal(attempts, 1);
    assert.equal(state.status, 'won');
    assert.equal(state.attempts, 1);
  });
});

describe('guess — full play-through', () => {
  test('binary search reaches correct, counting every attempt', () => {
    let state = newGame(1, 100, 42);
    let lo = state.min;
    let hi = state.max;
    let guesses = 0;
    let result;
    let attempts;

    do {
      const n = Math.floor((lo + hi) / 2);
      ({ state, result, attempts } = guess(state, n));
      guesses++;
      assert.equal(attempts, guesses, 'attempts must count every guess');
      assert.equal(attempts, state.attempts, 'returned attempts must match state.attempts');
      if (result === RESULTS.TOO_LOW) lo = n + 1;
      else if (result === RESULTS.TOO_HIGH) hi = n - 1;
      assert.ok(guesses <= 7, 'binary search over 100 values must finish within 7 guesses');
    } while (result !== RESULTS.CORRECT);

    assert.equal(state.status, 'won');
    assert.equal(state.attempts, guesses);
  });

  test('feedback is always truthful relative to the secret', () => {
    const start = newGame(1, 50, 7);
    for (let n = start.min; n <= start.max; n++) {
      const { result } = guess(start, n);
      const expected =
        n < start.secret ? RESULTS.TOO_LOW : n > start.secret ? RESULTS.TOO_HIGH : RESULTS.CORRECT;
      assert.equal(result, expected, `guess ${n} vs secret ${start.secret}`);
    }
  });
});

describe('guess — immutability of prior state', () => {
  test('guess never mutates its input state (wrong and correct guesses)', () => {
    const start = newGame(1, 100, 42);
    const snapshot = { ...start };

    guess(start, start.secret - 1 >= start.min ? start.secret - 1 : start.secret + 1);
    assert.deepEqual(start, snapshot, 'wrong guess mutated the input state');

    guess(start, start.secret);
    assert.deepEqual(start, snapshot, 'correct guess mutated the input state');
  });

  test('accepts a frozen state, so mutation would throw rather than pass silently', () => {
    const start = Object.freeze(newGame(1, 100, 9));
    const { result } = guess(start, start.secret);
    assert.equal(result, RESULTS.CORRECT);
  });

  test('a prior state can be replayed: same guess twice gives identical outcomes', () => {
    const start = newGame(1, 100, 13);
    const first = guess(start, start.secret);
    const second = guess(start, start.secret);
    assert.deepEqual(first, second);
    assert.notEqual(first.state, start, 'guess must return a new state object');
  });
});

describe('newGame — error paths', () => {
  test('TypeError when min or max is not an integer', () => {
    assert.throws(() => newGame(1.5, 100), TypeError);
    assert.throws(() => newGame(1, 99.9), TypeError);
    assert.throws(() => newGame('1', 100), TypeError);
    assert.throws(() => newGame(1, NaN), TypeError);
    assert.throws(() => newGame(1, Infinity), TypeError);
  });

  test('RangeError when min >= max', () => {
    assert.throws(() => newGame(10, 10), RangeError);
    assert.throws(() => newGame(10, 5), RangeError);
  });

  test('TypeError when seed is provided but not an integer', () => {
    assert.throws(() => newGame(1, 100, 1.5), TypeError);
    assert.throws(() => newGame(1, 100, 'seed'), TypeError);
    assert.throws(() => newGame(1, 100, NaN), TypeError);
    assert.throws(() => newGame(1, 100, null), TypeError);
  });
});

describe('guess — error paths', () => {
  test('TypeError when called without a valid game state', () => {
    assert.throws(() => guess(null, 50), TypeError);
    assert.throws(() => guess(undefined, 50), TypeError);
    assert.throws(() => guess({}, 50), TypeError);
  });

  test('TypeError when the guess is not an integer', () => {
    const state = newGame(1, 100, 42);
    assert.throws(() => guess(state, 50.5), TypeError);
    assert.throws(() => guess(state, '50'), TypeError);
    assert.throws(() => guess(state, NaN), TypeError);
    assert.throws(() => guess(state, undefined), TypeError);
  });

  test('RangeError when the guess is outside [min, max]', () => {
    const state = newGame(10, 20, 42);
    assert.throws(() => guess(state, 9), RangeError);
    assert.throws(() => guess(state, 21), RangeError);
  });

  test('Error when guessing on an already-won game', () => {
    const start = newGame(1, 100, 42);
    const { state: won } = guess(start, start.secret);
    assert.equal(won.status, 'won');
    assert.throws(
      () => guess(won, won.secret),
      (err) => err instanceof Error && !(err instanceof TypeError) && !(err instanceof RangeError)
    );
  });

  test('a rejected guess leaves the original state untouched and playable', () => {
    const state = newGame(1, 100, 42);
    const snapshot = { ...state };
    assert.throws(() => guess(state, 0), RangeError);
    assert.throws(() => guess(state, 1.5), TypeError);
    assert.deepEqual(state, snapshot);
    assert.equal(guess(state, state.secret).result, RESULTS.CORRECT);
  });
});
