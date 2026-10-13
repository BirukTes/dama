import { describe, it, expect } from 'vitest';
import {
  applyMove,
  initialState,
  legalMoves,
  edges,
  neighbours,
  key,
  settle,
  type State,
} from '../src/game/rules';
import { chooseMove } from '../src/ai/search';
import { validState } from '../src/persistence/save';
function position(
  board: State['board'],
  blue: number,
  coral: number,
  turn: State['turn'] = 'blue',
): State {
  const s: State = { board, delivered: { blue, coral }, turn, turns: 0, history: [], result: null };
  s.history = [key(s)];
  return s;
}
describe('original board and rules', () => {
  it('has 16 symmetric edges and connects the centre to every other node', () => {
    expect(edges).toHaveLength(16);
    expect(neighbours[4]).toHaveLength(8);
    neighbours.forEach((list, n) => list.forEach((m) => expect(neighbours[m]).toContain(n)));
  });
  it('rejects wrong-side, occupied, disconnected and post-game moves', () => {
    const s = initialState();
    for (const move of [
      { from: 0, to: 1 },
      { from: 2, to: 5 },
      { from: 2, to: 7 },
    ])
      expect(() => applyMove(s, move)).toThrow('Illegal move');
    const end = { ...s, result: { draw: 'turn-limit' as const } };
    expect(legalMoves(end)).toEqual([]);
    expect(() => applyMove(end, { from: 2, to: 4 })).toThrow();
  });
  it('moves exactly one pawn without mutating the prior position', () => {
    const s = initialState();
    const snapshot = structuredClone(s);
    const next = applyMove(s, { from: 2, to: 4 });
    expect(s).toEqual(snapshot);
    expect(next.board[2]).toBeNull();
    expect(next.board[4]).toBe('blue');
    expect(next.turn).toBe('coral');
    expect(next.turns).toBe(1);
  });
  it('removes a delivered pawn and ends on the third delivery', () => {
    const s = position([null, null, null, null, 'blue', null, null, 'coral', null], 2, 2);
    const end = applyMove(s, { from: 4, to: 0 });
    expect(end.board[0]).toBeNull();
    expect(end.delivered.blue).toBe(3);
    expect(end.result).toEqual({ winner: 'blue' });
    expect(validState(end)).toBe(true);
  });
  it('allows backward movement and delivery to any opposing edge node', () => {
    const s = position([null, 'blue', null, 'coral', 'blue', null, 'coral', 'blue', null], 0, 1);
    expect(legalMoves(s)).toContainEqual({ from: 4, to: 0 });
    expect(applyMove(s, { from: 4, to: 0 }).delivered.blue).toBe(1);
    expect(legalMoves(s)).not.toContainEqual({ from: 4, to: 3 });
    const back = position(
      ['coral', null, null, 'coral', 'blue', null, 'coral', 'blue', 'blue'],
      0,
      0,
    );
    expect(legalMoves(back)).toContainEqual({ from: 4, to: 2 });
  });
  it('draws on a third repeated position and at the turn limit', () => {
    const s = initialState();
    s.history = [key(s), key(s), key(s)];
    expect(settle(s).result).toEqual({ draw: 'repetition' });
    const limit = initialState();
    limit.turns = 99;
    expect(applyMove(limit, { from: 2, to: 4 }).result).toEqual({ draw: 'turn-limit' });
  });
  it('automatically passes a blocked player and records the passed turn', () => {
    const s = position([null, 'coral', 'blue', null, 'coral', 'blue', null, 'coral', 'blue'], 0, 0);
    const next = settle(s);
    expect(next.turn).toBe('coral');
    expect(next.turns).toBe(1);
    expect(next.history.at(-1)).toBe(key(next));
    expect(next.result).toBeNull();
  });
  it('keeps three active or delivered pawns per side across seeded games', () => {
    let seed = 123456;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let game = 0; game < 60; game++) {
      let s = initialState(game % 2 ? 'coral' : 'blue');
      while (!s.result) {
        const moves = legalMoves(s);
        expect(moves.length).toBeGreaterThan(0);
        s = applyMove(s, moves[Math.floor(random() * moves.length)]);
        expect(validState(s)).toBe(true);
        for (const side of ['blue', 'coral'] as const)
          expect(s.board.filter((p) => p === side).length + s.delivered[side]).toBe(3);
      }
    }
  });
  it('returns legal computer moves and takes an immediate win', () => {
    const s = initialState('coral');
    for (const difficulty of ['gentle', 'standard'] as const)
      expect(legalMoves(s)).toContainEqual(chooseMove(s, difficulty, () => 0.5));
    const win = position(
      [null, 'blue', null, null, 'coral', null, null, null, null],
      2,
      2,
      'coral',
    );
    const move = chooseMove(win, 'standard')!;
    expect(applyMove(win, move).result).toEqual({ winner: 'coral' });
  });
  it('rejects malformed saves and preserves history in a serialized round trip', () => {
    const s = applyMove(initialState(), { from: 2, to: 4 });
    expect(validState(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(validState({ ...s, history: [] })).toBe(false);
    expect(validState({ ...s, board: ['blue'] })).toBe(false);
    expect(validState({ ...s, delivered: { blue: 2, coral: 0 } })).toBe(false);
    expect(validState({ ...s, result: { winner: 'blue' } })).toBe(false);
  });
});
