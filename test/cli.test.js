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
import {
  parseGuess,
  feedbackFor,
  parsePlayAgain,
  winMessage,
  seedFromEnv,
  parseDifficulty,
  formatDifficultyPrompt,
  DIFFICULTIES,
} from '../src/cli.js';

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

describe('DIFFICULTIES', () => {
  test('offers at least three levels with distinct inclusive ranges', () => {
    assert.ok(DIFFICULTIES.length >= 3);
    const names = DIFFICULTIES.map((d) => d.name);
    assert.deepEqual(names, ['Easy', 'Medium', 'Hard']);
    for (const d of DIFFICULTIES) {
      assert.ok(Number.isInteger(d.min) && Number.isInteger(d.max) && d.min < d.max);
    }
  });

  test('Medium reproduces the historical default range exactly (1–100)', () => {
    const medium = DIFFICULTIES.find((d) => d.name === 'Medium');
    assert.deepEqual({ min: medium.min, max: medium.max }, { min: 1, max: 100 });
  });

  test('Easy is 1–10 and Hard is 1–1000', () => {
    const easy = DIFFICULTIES.find((d) => d.name === 'Easy');
    const hard = DIFFICULTIES.find((d) => d.name === 'Hard');
    assert.deepEqual({ min: easy.min, max: easy.max }, { min: 1, max: 10 });
    assert.deepEqual({ min: hard.min, max: hard.max }, { min: 1, max: 1000 });
  });
});

describe('parseDifficulty', () => {
  test('accepts a menu number and returns that level with its bounds', () => {
    assert.deepEqual(parseDifficulty('1'), { ok: true, value: DIFFICULTIES[0] });
    assert.deepEqual(parseDifficulty('2'), { ok: true, value: DIFFICULTIES[1] });
    assert.deepEqual(parseDifficulty('  3  '), { ok: true, value: DIFFICULTIES[2] });
  });

  test('accepts a level name, case-insensitive and trimmed', () => {
    assert.equal(parseDifficulty('easy').value, DIFFICULTIES[0]);
    assert.equal(parseDifficulty('Medium').value, DIFFICULTIES[1]);
    assert.equal(parseDifficulty(' HARD ').value, DIFFICULTIES[2]);
  });

  test('rejects blank input with a friendly re-prompt message', () => {
    for (const input of ['', '   ', '\t', null, undefined]) {
      const r = parseDifficulty(input);
      assert.equal(r.ok, false);
      assert.match(r.message, /choose a difficulty/i);
    }
  });

  test('rejects unrecognised input without crashing', () => {
    for (const input of ['0', '4', 'medi', 'insane', '2.0', 'e']) {
      const r = parseDifficulty(input);
      assert.equal(r.ok, false);
      assert.match(r.message, /isn't a difficulty/);
    }
  });
});

describe('formatDifficultyPrompt', () => {
  test('lists every level with its range, derived from DIFFICULTIES', () => {
    const prompt = formatDifficultyPrompt();
    for (const d of DIFFICULTIES) {
      assert.match(prompt, new RegExp(`${d.key}\\) ${d.name} \\(${d.min}-${d.max}\\)`));
    }
    assert.match(prompt, /Difficulty: $/);
  });
});

describe('CLI end-to-end (spawned with a seeded secret)', () => {
  test('full round on Medium: feedback, bad-input re-prompts, attempt count, clean exit (M2-R1/R2/R3, M4-R1/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stdout, stderr } = await runCli(
      ['2', String(secret - 1), 'abc', '', '101', String(secret + 1), String(secret), 'n'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /Choose a difficulty:/);
    // Medium reproduces the historical default range exactly.
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

  test('Easy selects the 1–10 range and a guess outside it is re-prompted (M4-R1/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 10);
    const { secret } = newGame(1, 10, seed);
    const { code, stdout, stderr } = await runCli(
      ['easy', '11', String(secret), 'n'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /thinking of a number between 1 and 10/);
    assert.match(stdout, /11 is out of range — guess between 1 and 10/);
    assert.match(stdout, /Correct! You got it in 1 attempt\./);
  });

  test('Hard selects the 1–1000 range (M4-R1/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 1000);
    const { secret } = newGame(1, 1000, seed);
    const { code, stdout } = await runCli(['3', String(secret), 'n'], {
      NUMBERGUESS_SEED: String(seed),
    });
    assert.equal(code, 0);
    assert.match(stdout, /thinking of a number between 1 and 1000/);
    assert.match(stdout, /Correct! You got it in 1 attempt\./);
  });

  test('an unrecognised difficulty re-prompts without crashing, then proceeds (M4-R2)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stdout, stderr } = await runCli(
      ['insane', '2', String(secret), 'n'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /"insane" isn't a difficulty/);
    assert.match(stdout, /thinking of a number between 1 and 100/);
    assert.match(stdout, /Correct! You got it in 1 attempt\./);
  });

  test('accepting a replay re-prompts for difficulty and starts a fresh game (M2-R3, M4-R1)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stdout } = await runCli(
      ['2', String(secret), 'y', '2', String(secret), 'no'],
      { NUMBERGUESS_SEED: String(seed) }
    );
    assert.equal(code, 0);
    const wins = stdout.match(/Correct! You got it in 1 attempt\./g) ?? [];
    assert.equal(wins.length, 2, 'expected two single-attempt wins across the replay');
    const prompts = stdout.match(/Choose a difficulty:/g) ?? [];
    assert.equal(prompts.length, 2, 'expected a difficulty prompt before each game');
  });

  test('EOF at the difficulty prompt exits cleanly with status 0 before any game (M4-R1)', async () => {
    const { code, stdout, stderr } = await runCli([]);
    assert.equal(code, 0);
    assert.equal(stderr, '');
    assert.match(stdout, /Choose a difficulty:/);
    assert.doesNotMatch(stdout, /thinking of a number/);
  });

  test('EOF mid-game (after a wrong guess) still exits with status 0 (M2-R2/R3)', async () => {
    const seed = seedWithInteriorSecret(1, 100);
    const { secret } = newGame(1, 100, seed);
    const { code, stderr } = await runCli(['2', String(secret - 1)], {
      NUMBERGUESS_SEED: String(seed),
    });
    assert.equal(code, 0);
    assert.equal(stderr, '');
  });
});
