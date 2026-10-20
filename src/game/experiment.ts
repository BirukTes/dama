import { labMaps, type LabMapId } from './experiment-maps';
import { initialState, other, type Move, type Side, type State } from './rules';

// Deliberately separate from production rules, saves, progression and puzzle solving.
export { bypasses } from './experiment-maps';
export interface Experiment extends State {
  labMap: LabMapId;
  extraRoutes: boolean;
  restricted: boolean;
  retreats: Record<Side, number>;
}
export const experimentKey = (s: Experiment) =>
  `${s.labMap}:${s.extraRoutes}:${s.restricted}:${s.board.map((p) => (p === 'blue' ? 'b' : p === 'coral' ? 'c' : '.')).join('')}:${s.turn}:${s.delivered.blue}:${s.delivered.coral}:${s.retreats.blue}:${s.retreats.coral}`;
export function newExperiment(
  extraRoutes = true,
  restricted = true,
  starter: Side = 'blue',
  labMap: LabMapId = 'diamond',
): Experiment {
  const map = labMaps[labMap];
  const s: Experiment = {
    ...initialState(starter),
    labMap,
    board: map.points.map((_, n) =>
      map.starts.blue.includes(n) ? 'blue' : map.starts.coral.includes(n) ? 'coral' : null,
    ),
    extraRoutes,
    restricted,
    retreats: { blue: 1, coral: 1 },
  };
  s.history = [experimentKey(s)];
  return s;
}
export function isRetreat(side: Side, move: Move, labMap: LabMapId = 'diamond'): boolean {
  const points = labMaps[labMap].points;
  const dx = points[move.to][0] - points[move.from][0];
  return side === 'blue' ? dx > 0 : dx < 0;
}
export function experimentMoves(s: Experiment, side = s.turn): Move[] {
  if (s.result) return [];
  const map = labMaps[s.labMap];
  const edges = [...map.edges, ...(s.extraRoutes ? map.extras : [])];
  return s.board.flatMap((p, from) =>
    p !== side
      ? []
      : edges.flatMap(([a, b]) => {
          const to = a === from ? b : b === from ? a : -1;
          const move = { from, to };
          return to >= 0 &&
            s.board[to] === null &&
            (!s.restricted || s.retreats[side] > 0 || !isRetreat(side, move, s.labMap))
            ? [move]
            : [];
        }),
  );
}
export function experimentMove(s: Experiment, move: Move): Experiment {
  if (!experimentMoves(s).some((m) => m.from === move.from && m.to === move.to))
    throw new Error('Illegal experimental move');
  const next: Experiment = {
    ...s,
    board: [...s.board],
    delivered: { ...s.delivered },
    retreats: { ...s.retreats },
    turn: other(s.turn),
    turns: s.turns + 1,
    history: [...s.history],
  };
  next.board[move.from] = null;
  if (labMaps[s.labMap].goals[s.turn].includes(move.to)) next.delivered[s.turn]++;
  else next.board[move.to] = s.turn;
  if (s.restricted && isRetreat(s.turn, move, s.labMap)) next.retreats[s.turn]--;
  if (next.delivered[s.turn] === 3) next.result = { winner: s.turn };
  next.history.push(experimentKey(next));
  if (!next.result && !experimentMoves(next).length) {
    if (!experimentMoves(next, s.turn).length) next.result = { draw: 'blocked' };
    else {
      next.turn = s.turn;
      next.turns++;
      next.history.push(experimentKey(next));
    }
  }
  if (!next.result && next.history.filter((k) => k === experimentKey(next)).length >= 3)
    next.result = { draw: 'repetition' };
  if (!next.result && next.turns >= 100) next.result = { draw: 'turn-limit' };
  return next;
}
export function experimentAI(s: Experiment): Move | undefined {
  const root = s.turn,
    points = labMaps[s.labMap].points;
  let budget = 12000;
  const value = (state: Experiment) => {
    if (state.result)
      return 'winner' in state.result ? (state.result.winner === root ? 100000 : -100000) : 0;
    let score = (state.delivered[root] - state.delivered[other(root)]) * 1000;
    state.board.forEach((p, n) => {
      if (p)
        score += (p === root ? 1 : -1) * (p === 'blue' ? 420 - points[n][0] : points[n][0] - 80);
    });
    return (
      score + (experimentMoves(state, root).length - experimentMoves(state, other(root)).length) * 5
    );
  };
  const search = (state: Experiment, depth: number, alpha: number, beta: number): number => {
    if (state.result || depth === 0 || --budget <= 0) return value(state);
    const maximize = state.turn === root;
    let best = maximize ? -Infinity : Infinity;
    for (const move of experimentMoves(state)) {
      const score = search(experimentMove(state, move), depth - 1, alpha, beta);
      best = maximize ? Math.max(best, score) : Math.min(best, score);
      if (maximize) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (beta <= alpha || budget <= 0) break;
    }
    return Number.isFinite(best) ? best : value(state);
  };
  let best: Move | undefined,
    bestScore = -Infinity;
  for (const move of experimentMoves(s)) {
    const score = search(experimentMove(s, move), 3, -Infinity, Infinity);
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}
