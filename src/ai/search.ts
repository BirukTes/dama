import {
  applyMove,
  legalMoves,
  other,
  type Side,
  type State,
  type Move,
  goals,
  neighbours,
} from '../game/rules';
export type Difficulty = 'gentle' | 'standard';
const distance = (start: number, side: Side): number => {
  let frontier = [start];
  const visited = new Set(frontier);
  for (let d = 0; frontier.length; d++) {
    if (frontier.some((n) => goals[side].includes(n))) return d;
    frontier = frontier
      .flatMap((n) => neighbours[n])
      .filter((n) => {
        if (visited.has(n)) return false;
        visited.add(n);
        return true;
      });
  }
  return 9;
};
function evaluate(s: State, side: Side): number {
  if (s.result)
    return 'winner' in s.result
      ? s.result.winner === side
        ? 10000 - s.turns
        : -10000 + s.turns
      : 0;
  const score = (who: Side) =>
    s.delivered[who] * 100 -
    s.board.reduce((sum, p, n) => sum + (p === who ? distance(n, who) * 12 : 0), 0) +
    legalMoves(s, who).length * 2;
  return score(side) - score(other(side));
}
export function chooseMove(
  s: State,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (difficulty === 'gentle' && random() < 0.35) return moves[Math.floor(random() * moves.length)];
  const side = s.turn;
  let nodes = 0;
  function search(state: State, depth: number, alpha: number, beta: number): number {
    if (++nodes > 18000 || depth === 0 || state.result) return evaluate(state, side);
    const maximizing = state.turn === side;
    let best = maximizing ? -Infinity : Infinity;
    for (const m of legalMoves(state)) {
      const score = search(applyMove(state, m), depth - 1, alpha, beta);
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return Number.isFinite(best) ? best : evaluate(state, side);
  }
  let best = -Infinity;
  let chosen = moves[0];
  for (const m of moves) {
    const score = search(applyMove(s, m), difficulty === 'gentle' ? 1 : 4, -Infinity, Infinity);
    if (score > best) {
      best = score;
      chosen = m;
    }
  }
  return chosen;
}
