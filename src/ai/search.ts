import {
  applyMove,
  legalMoves,
  other,
  type Side,
  type State,
  type Move,
  goalsFor,
} from '../game/rules';
import { maps, mapFor, type MapId } from '../game/maps';
import type { OpponentId } from '../game/opponents';
export type Difficulty = 'gentle' | 'standard';
const distance = (start: number, side: Side, map: MapId): number => {
  let frontier = [start];
  const visited = new Set(frontier);
  for (let d = 0; frontier.length; d++) {
    if (frontier.some((n) => mapFor(map).goals[side].includes(n))) return d;
    frontier = frontier
      .flatMap((n) => mapFor(map).neighbours[n])
      .filter((n) => {
        if (visited.has(n)) return false;
        visited.add(n);
        return true;
      });
  }
  return 9;
};
const distancesFor = (map: MapId) => ({
  blue: mapFor(map).points.map((_, n) => distance(n, 'blue', map)),
  coral: mapFor(map).points.map((_, n) => distance(n, 'coral', map)),
});
const distances = Object.fromEntries(
  Object.keys(maps).map((id) => [id, distancesFor(id as MapId)]),
) as Record<MapId, ReturnType<typeof distancesFor>>;
function evaluate(s: State, side: Side, opponent: OpponentId): number {
  if (s.result)
    return 'winner' in s.result
      ? s.result.winner === side
        ? 10000 - s.turns
        : -10000 + s.turns
      : 0;
  const score = (who: Side) => {
    const moves = legalMoves(s, who);
    const threats = moves.filter((m) => goalsFor(s)[who].includes(m.to)).length;
    const runner = opponent === 'runner';
    return (
      s.delivered[who] * (runner ? 160 : 100) -
      s.board.reduce(
        (sum, p, n) =>
          sum + (p === who ? distances[s.map ?? 'classic'][who][n] * (runner ? 24 : 12) : 0),
        0,
      ) +
      moves.length * (opponent === 'guardian' ? 9 : 2) +
      threats * (runner ? 14 : 4)
    );
  };
  // Value deliveries symmetrically: overvaluing the rival's score made Guardian
  // settle for draws too early. Its stronger mobility weight still rewards blocking.
  const centre =
    opponent === 'guardian'
      ? mapFor(s.map).junctions.reduce(
          (sum, n) => sum + (s.board[n] === side ? 6 : s.board[n] === other(side) ? -6 : 0),
          0,
        ) / Math.max(1, mapFor(s.map).junctions.length)
      : 0;
  return score(side) - score(other(side)) + centre;
}
export function chooseMove(
  s: State,
  difficulty: Difficulty,
  random: () => number = Math.random,
  opponent: OpponentId = 'coral',
): Move | null {
  let moves = legalMoves(s);
  if (!moves.length) return null;
  const side = s.turn;
  const immediate = moves.filter((m) => {
    const result = applyMove(s, m).result;
    return result && 'winner' in result && result.winner === side;
  });
  const pick = (options: Move[]) =>
    options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  if (immediate.length) return pick(immediate);
  const safe = moves.filter((m) => {
    const next = applyMove(s, m);
    return (
      next.result ||
      next.turn === side ||
      !legalMoves(next).some((reply) => {
        const result = applyMove(next, reply).result;
        return result && 'winner' in result && result.winner !== side;
      })
    );
  });
  if (safe.length) moves = safe;
  if (difficulty === 'gentle' && random() < 0.25) return pick(moves);
  let nodes = 0;
  const exhausted = Symbol('search budget');
  const ordered = (state: State) =>
    legalMoves(state).sort(
      (a, b) =>
        Number(goalsFor(state)[state.turn].includes(b.to)) -
        Number(goalsFor(state)[state.turn].includes(a.to)),
    );
  function search(state: State, depth: number, alpha: number, beta: number): number {
    if (++nodes > 24000) throw exhausted;
    if (depth === 0 || state.result) return evaluate(state, side, opponent);
    const maximizing = state.turn === side;
    let best = maximizing ? -Infinity : Infinity;
    for (const m of ordered(state)) {
      const score = search(applyMove(state, m), depth - 1, alpha, beta);
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return Number.isFinite(best) ? best : evaluate(state, side, opponent);
  }
  let finalists = moves;
  const maxDepth =
    difficulty === 'gentle' ? 2 : opponent === 'coral' ? 3 : opponent === 'runner' ? 4 : 6;
  // Only completed depths decide a move; a partial search must not favour early options.
  for (let depth = 1; depth <= maxDepth; depth++) {
    let best = -Infinity;
    const candidates: Move[] = [];
    try {
      for (const m of moves) {
        const next = applyMove(s, m);
        const repeats = s.history.filter((k) => k === next.history.at(-1)).length;
        const value = search(next, depth - 1, -Infinity, Infinity);
        // Prefer fresh routes when viable; never penalise a terminal draw or forced win/loss.
        const score = value - (!next.result && Math.abs(value) < 1000 ? repeats * 10 : 0);
        if (score > best + 0.00001) {
          best = score;
          candidates.length = 0;
          candidates.push(m);
        } else if (Math.abs(score - best) < 0.00001) candidates.push(m);
      }
    } catch (error) {
      if (error === exhausted) break;
      throw error;
    }
    finalists = candidates;
  }
  return pick(finalists);
}
