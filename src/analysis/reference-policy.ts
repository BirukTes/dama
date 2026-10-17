import {
  applyMove,
  legalMoves,
  other,
  goals,
  neighbours,
  type State,
  type Side,
  type Move,
} from '../game/rules';

// Frozen three-ply balanced reference, matching the pre-tuning Coral policy.
// Keep this independent of the live opponents so comparisons stay repeatable.
const distance = (start: number, side: Side) => {
  let layer = [start];
  const seen = new Set(layer);
  for (let d = 0; layer.length; d++) {
    if (layer.some((n) => goals[side].includes(n))) return d;
    layer = layer
      .flatMap((n) => neighbours[n])
      .filter((n) => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
  }
  return 9;
};
const distances = {
  blue: Array.from({ length: 9 }, (_, n) => distance(n, 'blue')),
  coral: Array.from({ length: 9 }, (_, n) => distance(n, 'coral')),
};
export function referenceMove(s: State): Move | null {
  const side = s.turn;
  function value(state: State): number {
    if (state.result)
      return 'winner' in state.result
        ? state.result.winner === side
          ? 10000 - state.turns
          : -10000 + state.turns
        : 0;
    const score = (who: Side) =>
      state.delivered[who] * 100 -
      state.board.reduce((sum, p, n) => sum + (p === who ? distances[who][n] * 12 : 0), 0) +
      legalMoves(state, who).length * 2 +
      legalMoves(state, who).filter((m) => goals[who].includes(m.to)).length * 4;
    return score(side) - score(other(side));
  }
  function search(state: State, depth: number): number {
    if (!depth || state.result) return value(state);
    const scores = legalMoves(state).map((m) => search(applyMove(state, m), depth - 1));
    return scores.length
      ? state.turn === side
        ? Math.max(...scores)
        : Math.min(...scores)
      : value(state);
  }
  let best = -Infinity,
    chosen: Move | null = null;
  for (const m of legalMoves(s)) {
    const score = search(applyMove(s, m), 2);
    if (score > best) {
      best = score;
      chosen = m;
    }
  }
  return chosen;
}
