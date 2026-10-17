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
import type { OpponentId } from '../game/opponents';
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
function evaluate(s: State, side: Side, opponent: OpponentId): number {
  if (s.result)
    return 'winner' in s.result
      ? s.result.winner === side
        ? 10000 - s.turns
        : -10000 + s.turns
      : 0;
  const score = (who: Side) => {
    const moves = legalMoves(s, who);
    const threats = moves.filter((m) => goals[who].includes(m.to)).length;
    const runner = opponent === 'runner';
    return (
      s.delivered[who] * (runner ? 160 : 100) -
      s.board.reduce(
        (sum, p, n) => sum + (p === who ? distance(n, who) * (runner ? 24 : 12) : 0),
        0,
      ) +
      moves.length * (opponent === 'guardian' ? 9 : 2) +
      threats * (runner ? 14 : 4)
    );
  };
  // Guardian gives extra weight to reducing the rival's mobility and delivery threats.
  return score(side) - score(other(side)) * (opponent === 'guardian' ? 1.35 : 1);
}
export function chooseMove(
  s: State,
  difficulty: Difficulty,
  random: () => number = Math.random,
  opponent: OpponentId = 'coral',
): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (difficulty === 'gentle' && random() < 0.35) return moves[Math.floor(random() * moves.length)];
  const side = s.turn;
  let nodes = 0;
  function search(state: State, depth: number, alpha: number, beta: number): number {
    if (++nodes > 18000 || depth === 0 || state.result) return evaluate(state, side, opponent);
    const maximizing = state.turn === side;
    let best = maximizing ? -Infinity : Infinity;
    for (const m of legalMoves(state)) {
      const score = search(applyMove(state, m), depth - 1, alpha, beta);
      best = maximizing ? Math.max(best, score) : Math.min(best, score);
      if (maximizing) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return Number.isFinite(best) ? best : evaluate(state, side, opponent);
  }
  let best = -Infinity;
  let chosen = moves[0];
  for (const m of moves) {
    // Coral looks ahead less far; Runner races, Guardian plans deeper around restrictions.
    nodes = 0;
    const depth =
      difficulty === 'gentle' ? 1 : opponent === 'coral' ? 2 : opponent === 'runner' ? 3 : 5;
    const score = search(applyMove(s, m), depth, -Infinity, Infinity);
    if (score > best) {
      best = score;
      chosen = m;
    }
  }
  return chosen;
}
