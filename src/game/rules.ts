export type Side = 'coral' | 'blue';
export type Result = { winner: Side } | { draw: 'repetition' | 'blocked' | 'turn-limit' };
export interface Move {
  from: number;
  to: number;
}
export interface State {
  board: (Side | null)[];
  delivered: Record<Side, number>;
  turn: Side;
  turns: number;
  history: string[];
  result: Result | null;
}
export const other = (side: Side): Side => (side === 'blue' ? 'coral' : 'blue');
export const goals: Record<Side, number[]> = { blue: [0, 3, 6], coral: [2, 5, 8] };
export const edges: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 5],
  [5, 8],
  [8, 7],
  [7, 6],
  [6, 3],
  [3, 0],
  ...[0, 1, 2, 3, 5, 6, 7, 8].map((n) => [4, n] as [number, number]),
];
export const neighbours = Array.from({ length: 9 }, (_, n) =>
  edges.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])),
);
export const key = (s: State): string =>
  `${s.board.map((p) => (p === 'blue' ? 'b' : p === 'coral' ? 'c' : '.')).join('')}:${s.delivered.blue}:${s.delivered.coral}:${s.turn}`;
export function initialState(turn: Side = 'blue'): State {
  const s: State = {
    board: ['coral', null, 'blue', 'coral', null, 'blue', 'coral', null, 'blue'],
    delivered: { blue: 0, coral: 0 },
    turn,
    turns: 0,
    history: [],
    result: null,
  };
  s.history = [key(s)];
  return s;
}
export function legalMoves(s: State, side: Side = s.turn): Move[] {
  if (s.result) return [];
  return s.board.flatMap((p, from) =>
    p === side
      ? neighbours[from].filter((to) => s.board[to] === null).map((to) => ({ from, to }))
      : [],
  );
}
export function settle(s: State): State {
  if (s.result) return s;
  if (legalMoves(s).length === 0) {
    if (legalMoves(s, other(s.turn)).length === 0) return { ...s, result: { draw: 'blocked' } };
    s = { ...s, turn: other(s.turn), turns: s.turns + 1 };
    s = { ...s, history: [...s.history, key(s)] };
  }
  if (s.history.filter((k) => k === key(s)).length >= 3)
    return { ...s, result: { draw: 'repetition' } };
  if (s.turns >= 100) return { ...s, result: { draw: 'turn-limit' } };
  return s;
}
export function applyMove(s: State, move: Move): State {
  if (!legalMoves(s).some((m) => m.from === move.from && m.to === move.to))
    throw new Error('Illegal move');
  const board = [...s.board];
  const delivered = { ...s.delivered };
  board[move.from] = null;
  if (goals[s.turn].includes(move.to)) delivered[s.turn]++;
  else board[move.to] = s.turn;
  let next: State = {
    board,
    delivered,
    turn: other(s.turn),
    turns: s.turns + 1,
    history: [],
    result: delivered[s.turn] === 3 ? { winner: s.turn } : null,
  };
  next.history = [...s.history, key(next)];
  return settle(next);
}
