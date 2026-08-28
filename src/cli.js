/**
 * numberguess interactive CLI — thin readline I/O layer over the pure engine.
 *
 * Run via `npm start` (or `node src/cli.js`). All game logic lives in
 * ./engine.js; this file only translates lines of input into engine calls
 * and engine results into printed feedback.
 *
 * Input handling is split into pure, exported helpers (parseGuess,
 * feedbackFor, parsePlayAgain, winMessage) so tests can cover them without
 * driving readline. The interactive loop only starts when this file is the
 * entry module, so importing it has no side effects.
 *
 * Set NUMBERGUESS_SEED to an integer for a deterministic secret (used by
 * the e2e tests; ignored when absent or not an integer).
 */

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { newGame, guess, RESULTS } from './engine.js';

/**
 * Parse one line of player input into a guess.
 *
 * @param {string} input raw line from the prompt
 * @param {number} min inclusive lower bound of the current game
 * @param {number} max inclusive upper bound of the current game
 * @returns {{ok: true, value: number} | {ok: false, message: string}}
 *   On failure, `message` is a friendly re-prompt line; the engine is never
 *   called with unvalidated input, so bad input can't crash the process.
 */
export function parseGuess(input, min, max) {
  const trimmed = (input ?? '').trim();
  if (trimmed === '') {
    return { ok: false, message: `Please type a number between ${min} and ${max}.` };
  }
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return { ok: false, message: `"${trimmed}" isn't a whole number — try again.` };
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return { ok: false, message: `${trimmed} is out of range — guess between ${min} and ${max}.` };
  }
  return { ok: true, value };
}

/**
 * Map an engine result to a feedback line.
 *
 * @param {string} result one of the engine RESULTS values
 * @returns {string}
 * @throws {Error} if the result is not a known RESULTS value
 */
export function feedbackFor(result) {
  switch (result) {
    case RESULTS.TOO_LOW:
      return 'Too low!';
    case RESULTS.TOO_HIGH:
      return 'Too high!';
    case RESULTS.CORRECT:
      return 'Correct!';
    default:
      throw new Error(`unknown engine result: ${result}`);
  }
}

/**
 * @param {number} attempts
 * @returns {string} the win announcement, with attempt count
 */
export function winMessage(attempts) {
  return `Correct! You got it in ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}.`;
}

/**
 * Interpret the answer to "Play again?". Only an explicit yes replays;
 * anything else (including EOF, passed as null) declines.
 *
 * @param {string | null} input
 * @returns {boolean}
 */
export function parsePlayAgain(input) {
  if (input == null) return false;
  const t = input.trim().toLowerCase();
  return t === 'y' || t === 'yes';
}

/**
 * Resolve NUMBERGUESS_SEED from an env object: an integer seed, or
 * undefined (random secret) when absent or malformed.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {number | undefined}
 */
export function seedFromEnv(env) {
  const raw = env.NUMBERGUESS_SEED;
  if (raw === undefined || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isInteger(n) ? n : undefined;
}

/**
 * Wrap a readline interface in a pull-based line queue. The 'line'
 * listener attaches immediately, so lines from a fully-buffered pipe that
 * arrive between prompts are queued instead of dropped (rl.question loses
 * them). next() resolves the next line, or null once input has ended
 * (EOF/Ctrl-D).
 */
function lineQueue(rl) {
  const pending = [];
  const waiters = [];
  let closed = false;
  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else pending.push(line);
  });
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });
  return {
    next() {
      if (pending.length) return Promise.resolve(pending.shift());
      if (closed) return Promise.resolve(null);
      return new Promise((resolve) => waiters.push(resolve));
    },
  };
}

/**
 * Run the interactive play-loop until the player declines a replay or
 * input ends. Returns the intended exit code (always 0: bad input
 * re-prompts, EOF is a normal way to leave).
 *
 * @param {{input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream, env?: Record<string, string | undefined>}} [io]
 * @returns {Promise<number>}
 */
export async function main({ input = process.stdin, output = process.stdout, env = process.env } = {}) {
  const rl = createInterface({ input, output });
  const lines = lineQueue(rl);
  const seed = seedFromEnv(env);
  const ask = (prompt) => {
    output.write(prompt);
    return lines.next();
  };
  try {
    let playing = true;
    while (playing) {
      let state = newGame(1, 100, seed);
      output.write(`I'm thinking of a number between ${state.min} and ${state.max}. Can you guess it?\n`);
      let won = false;
      while (!won) {
        const answer = await ask('Your guess: ');
        if (answer === null) return 0;
        const parsed = parseGuess(answer, state.min, state.max);
        if (!parsed.ok) {
          output.write(`${parsed.message}\n`);
          continue;
        }
        const turn = guess(state, parsed.value);
        state = turn.state;
        if (turn.result === RESULTS.CORRECT) {
          output.write(`${winMessage(turn.attempts)}\n`);
          won = true;
        } else {
          output.write(`${feedbackFor(turn.result)}\n`);
        }
      }
      const again = await ask('Play again? (y/n) ');
      playing = parsePlayAgain(again);
    }
    output.write('Thanks for playing!\n');
    return 0;
  } finally {
    rl.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  });
}
