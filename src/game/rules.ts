import { mapFor, type MapId } from './maps';
export type Side = 'coral' | 'blue';
export type Result = { winner: Side } | { draw: 'repetition' | 'blocked' | 'turn-limit' };
export interface Move {
  from: number;
  to: number;
}
export interface State {
  map?: MapId;
  board: (Side | null)[];
  delivered: Record<Side, number>;
  turn: Side;
  turns: number;
  history: string[];
  result: Result | null;
}
export const other = (side: Side): Side => (side === 'blue' ? 'coral' : 'blue');
export const goals: Record<Side, number[]> = { blue: [0, 3, 6], coral: [2, 5, 8] };
export const goalsFor = (s: State) => mapFor(s.map).goals;
// Classic exports remain available for the original analysis and puzzle fixtures.
export const { edges, neighbours } = mapFor('classic');
export const key = (s: State): string =>
  `${s.map && s.map !== 'classic' ? `${s.map}|` : ''}${s.board.map((p) => (p === 'blue' ? 'b' : p === 'coral' ? 'c' : '.')).join('')}:${s.delivered.blue}:${s.delivered.coral}:${s.turn}`;
export function initialState(turn: Side = 'blue', map: MapId = 'classic'): State {
  const s: State = {
    ...(map === 'classic' ? {} : { map }),
    board: mapFor(map).points.map((_, n) =>
      mapFor(map).starts.blue.includes(n)
        ? 'blue'
        : mapFor(map).starts.coral.includes(n)
          ? 'coral'
          : null,
    ),
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
      ? mapFor(s.map)
          .neighbours[from].filter((to) => s.board[to] === null)
          .map((to) => ({ from, to }))
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
  if (goalsFor(s)[s.turn].includes(move.to)) delivered[s.turn]++;
  else board[move.to] = s.turn;
  let next: State = {
    ...(s.map ? { map: s.map } : {}),
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
