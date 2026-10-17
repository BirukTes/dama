import { initialState, key, legalMoves, applyMove, type State } from '../game/rules';
import { isMapId } from '../game/maps';
declare const process: { argv: string[] };
const map = process.argv[2] ?? 'classic';
if (!isMapId(map)) throw new Error('Choose a known board map.');
// Enumerate baseline position transitions; discard repetition and turn-limit history.
// Retrograde results below apply to the baseline with cycles treated as draws.
const queue: State[] = [initialState('blue', map), initialState('coral', map)];
const seen = new Set(queue.map(key));
let wins = 0,
  passes = 0,
  blocked = 0,
  maxBranching = 0;
const links = new Map<string, string[]>();
for (let index = 0; index < queue.length; index++) {
  const s = queue[index];
  if (s.result) {
    if ('winner' in s.result) wins++;
    else blocked++;
    continue;
  }
  const moves = legalMoves(s);
  maxBranching = Math.max(maxBranching, moves.length);
  const children: string[] = [];
  for (const move of moves) {
    let next = applyMove(s, move);
    if (next.turn === s.turn && !next.result) passes++;
    next = { ...next, turns: 0, history: [] };
    next.history = [key(next)];
    const k = key(next);
    children.push(k);
    if (!seen.has(k)) {
      seen.add(k);
      queue.push(next);
    }
  }
  links.set(key(s), children);
}
const states = new Map(queue.map((s) => [key(s), s]));
const predecessors = new Map<string, string[]>();
const remaining = new Map<string, number>();
for (const [parent, children] of links) {
  remaining.set(parent, children.length);
  for (const child of children)
    predecessors.set(child, [...(predecessors.get(child) ?? []), parent]);
}
const outcome = new Map<string, 'blue' | 'coral'>();
const resolved: string[] = [];
for (const s of queue)
  if (s.result && 'winner' in s.result) {
    outcome.set(key(s), s.result.winner);
    resolved.push(key(s));
  }
for (let i = 0; i < resolved.length; i++) {
  const child = resolved[i],
    winner = outcome.get(child)!;
  for (const parent of predecessors.get(child) ?? []) {
    if (outcome.has(parent)) continue;
    const turn = states.get(parent)!.turn;
    if (winner === turn) {
      outcome.set(parent, turn);
      resolved.push(parent);
    } else {
      const count = remaining.get(parent)! - 1;
      remaining.set(parent, count);
      if (count === 0) {
        outcome.set(parent, winner);
        resolved.push(parent);
      }
    }
  }
}
console.log(
  JSON.stringify(
    {
      map,
      reachableBaselinePositions: seen.size,
      winningPositions: wins,
      blockedDrawPositions: blocked,
      passTransitions: passes,
      maxLegalMoves: maxBranching,
      baselineBlueStarts: outcome.get(key(initialState('blue', map))) ?? 'draw',
      baselineCoralStarts: outcome.get(key(initialState('coral', map))) ?? 'draw',
      baselineDrawPositions: seen.size - outcome.size,
      scope:
        'Finite baseline graph with automatic passes and indefinite cycles treated as draws. Threefold-repetition history and the 100-turn cap are excluded; these outcomes do not establish the final ruleset balance or human match quality.',
    },
    null,
    2,
  ),
);
