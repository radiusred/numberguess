/**
 * CLI test suite (M2-R1…R4).
 *
 * Unit-tests the pure input helpers exported by src/cli.js (parseGuess,
 * feedbackFor, parsePlayAgain, winMessage, seedFromEnv), then drives the
 * real CLI end-to-end: `node src/cli.js` is spawned with NUMBERGUESS_SEED
 * so the secret is known, stdin is scripted, and stdout plus the exit code
 * are asserted. Importing src/cli.js starts nothing — the interactive loop
 * is guarded behind an entry-module check.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { newGame, RESULTS } from '../src/engine.js';
import { parseGuess, feedbackFor, parsePlayAgain, winMessage, seedFromEnv } from '../src/cli.js';

const CLI = fileURLToPath(new URL('../src/cli.js', import.meta.url));

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

/**
 * Spawn the CLI, feed it `lines` on stdin (then EOF), and collect output.
 *
 * @param {string[]} lines answers, one per prompt
 * @param {Record<string, string>} [env] extra environment (e.g. the seed)
 * @returns {Promise<{code: number | null, stdout: string, stderr: string}>}
 */
function runCli(lines, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI], { env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(lines.map((l) => `${l}\n`).join(''));
  });
}

describe('parseGuess', () => {
  test('accepts integers within range, with surrounding whitespace', () => {
    assert.deepEqual(parseGuess('42', 1, 100), { ok: true, value: 42 });
    assert.deepEqual(parseGuess('  7  ', 1, 100), { ok: true, value: 7 });
    assert.deepEqual(parseGuess('1', 1, 100), { ok: true, value: 1 });
    assert.deepEqual(parseGuess('100', 1, 100), { ok: true, value: 100 });
    assert.deepEqual(parseGuess('-5', -10, 10), { ok: true, value: -5 });
    assert.deepEqual(parseGuess('+3', 1, 100), { ok: true, value: 3 });
  });

  test('rejects blank input with a friendly message', () => {
    for (const input of ['', '   ', '\t', null, undefined]) {
      const r = parseGuess(input, 1, 100);
      assert.equal(r.ok, false);
      assert.match(r.message, /between 1 and 100/);
    }
  });

  test('rejects non-integer input', () => {
    for (const input of ['abc', '3.5', '1e3', 'seven', '12abc', '--4', '4-2']) {
      const r = parseGuess(input, 1, 100);
      assert.equal(r.ok, false);
      assert.match(r.message, /whole number/);
    }
  });

  test('rejects out-of-range and unsafely large integers', () => {
    for (const input of ['0', '101', '-1', '99999999999999999999']) {
      const r = parseGuess(input, 1, 100);
      assert.equal(r.ok, false);
      assert.match(r.message, /out of range/);
    }
  });
});

describe('feedbackFor', () => {
  test('maps every engine result to a feedback line', () => {
    assert.equal(feedbackFor(RESULTS.TOO_LOW), 'Too low!');
    assert.equal(feedbackFor(RESULTS.TOO_HIGH), 'Too high!');
    assert.equal(feedbackFor(RESULTS.CORRECT), 'Correct!');
  });

  test('throws on an unknown result value', () => {
    assert.throws(() => feedbackFor('sideways'), /unknown engine result/);
  });
});

describe('parsePlayAgain', () => {
  test('only an explicit yes replays', () => {
    for (const input of ['y', 'Y', 'yes', 'YES', ' yes ']) {
      assert.equal(parsePlayAgain(input), true, `expected yes for ${JSON.stringify(input)}`);
    }
    for (const input of ['n', 'no', '', '  ', 'maybe', 'yep?', null]) {
      assert.equal(parsePlayAgain(input), false, `expected no for ${JSON.stringify(input)}`);
    }
  });
});

describe('winMessage', () => {
  test('reports the attempt count, pluralized', () => {
    assert.equal(winMessage(1), 'Correct! You got it in 1 attempt.');
    assert.equal(winMessage(3), 'Correct! You got it in 3 attempts.');
  });
});

describe('seedFromEnv', () => {
  test('returns the integer seed when set, undefined otherwise', () => {
    assert.equal(seedFromEnv({ NUMBERGUESS_SEED: '42' }), 42);
    assert.equal(seedFromEnv({ NUMBERGUESS_SEED: '-7' }), -7);
    assert.equal(seedFromEnv({}), undefined);
    assert.equal(seedFromEnv({ NUMBERGUESS_SEED: '' }), undefined);
    assert.equal(seedFromEnv({ NUMBERGUESS_SEED: 'abc' }), undefined);
    assert.equal(seedFromEnv({ NUMBERGUESS_SEED: '1.5' }), undefined);
  });
});

describe('CLI end-to-end (spawned with a seeded secret)', () => {
  test('full round: feedback, bad-input re-prompts, attempt count, clean exit (M2-R1/R2/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stdout, stderr } = await runCli(
      [String(secret - 1), 'abc', '', '101', String(secret + 1), String(secret), 'n'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /thinking of a number between 1 and 100/);
    assert.match(stdout, /Too low!/);
    assert.match(stdout, /isn't a whole number/);
    assert.match(stdout, /Please type a number between 1 and 100/);
    assert.match(stdout, /101 is out of range/);
    assert.match(stdout, /Too high!/);
    // Only the three valid guesses count as attempts.
    assert.match(stdout, /Correct! You got it in 3 attempts\./);
    assert.match(stdout, /Play again\?/);
    assert.match(stdout, /Thanks for playing!/);
  });

  test('accepting a replay starts a fresh game (M2-R3)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stdout } = await runCli(
      [String(secret), 'y', String(secret), 'no'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    const wins = stdout.match(/Correct! You got it in 1 attempt\./g) ?? [];
    assert.equal(wins.length, 2, 'expected two single-attempt wins across the replay');
  });

  test('EOF at the first prompt exits cleanly with status 0 (M2-R3)', async () => {
    const { code, stdout, stderr } = await runCli([]);
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /thinking of a number between 1 and 100/);
  });

  test('EOF mid-game (after a wrong guess) still exits with status 0 (M2-R2/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stderr } = await runCli([String(secret - 1)], {
      NUMBERGUESS_SEED: String(seed),
    });
    assert.equal(code, 0);
    assert.equal(stderr, '');
  });
});
