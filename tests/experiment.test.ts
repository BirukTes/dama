import { describe, it, expect } from 'vitest';
import {
  newExperiment,
  experimentMoves,
  experimentMove,
  experimentAI,
  experimentKey,
  isRetreat,
} from '../src/game/experiment';
import { initialState, legalMoves, applyMove } from '../src/game/rules';
import { labMaps, type LabMapId } from '../src/game/experiment-maps';

describe('local routes and retreat experiment', () => {
  for (const id of Object.keys(labMaps) as LabMapId[]) {
    it(`${id} has a connected graph, valid starts and playable goals for both sides`, () => {
      const map = labMaps[id],
        edges = [...map.edges, ...map.extras];
      expect(new Set(edges.map(([a, b]) => [a, b].sort((a, b) => a - b).join(':'))).size).toBe(
        edges.length,
      );
      const seen = new Set([0]);
      for (let i = 0; i < map.points.length; i++)
        for (const [a, b] of edges) {
          expect(a).toBeLessThan(map.points.length);
          expect(b).toBeLessThan(map.points.length);
          if (seen.has(a)) seen.add(b);
          if (seen.has(b)) seen.add(a);
        }
      expect(seen.size).toBe(map.points.length);
      for (const side of ['blue', 'coral'] as const) {
        const initial = newExperiment(true, true, side, id);
        expect(initial.board.filter((p) => p === side)).toHaveLength(3);
        expect(experimentMoves(initial).length).toBeGreaterThan(0);
        const goal = map.goals[side][0];
        const from = edges
          .flatMap(([a, b]) => (a === goal ? [b] : b === goal ? [a] : []))
          .find((n) => !map.goals[side].includes(n))!;
        const other = side === 'blue' ? 'coral' : 'blue';
        initial.board.fill(null);
        initial.board[from] = side;
        initial.board[map.starts[other][2]] = other;
        initial.delivered = { blue: 2, coral: 2 };
        initial.history = [experimentKey(initial)];
        const next = experimentMove(initial, { from, to: goal });
        expect(next.result).toEqual({ winner: side });
        expect(next.board[goal]).toBeNull();
      }
    });
    for (const restricted of [false, true])
      it(`${id}: computer finishes legally with retreats ${restricted ? 'limited' : 'unlimited'}`, () => {
        let s = newExperiment(true, restricted, 'blue', id);
        for (let i = 0; i < 100 && !s.result; i++) {
          const move = experimentAI(s);
          expect(experimentMoves(s)).toContainEqual(move);
          s = experimentMove(s, move!);
          expect(s.retreats.blue).toBeGreaterThanOrEqual(0);
          expect(s.retreats.coral).toBeGreaterThanOrEqual(0);
          for (const side of ['blue', 'coral'] as const)
            expect(s.board.filter((p) => p === side).length + s.delivered[side]).toBe(3);
        }
        expect(s.result).not.toBeNull();
      });
  }
  it('adds bypass connections without changing the normal game', () => {
    const plain = newExperiment(false, false),
      extra = newExperiment(true, false);
    expect(experimentMoves(extra)).toContainEqual({ from: 5, to: 1 });
    expect(experimentMoves(plain)).not.toContainEqual({ from: 5, to: 1 });
    expect(legalMoves(initialState())).not.toContainEqual({ from: 5, to: 1 });
  });
  it('spends each side’s retreat independently and prohibits a second', () => {
    let s = newExperiment();
    const start = s;
    for (const move of [
      { from: 2, to: 1 },
      { from: 3, to: 4 },
      { from: 1, to: 2 },
      { from: 4, to: 3 },
      { from: 2, to: 1 },
      { from: 3, to: 4 },
    ])
      s = experimentMove(s, move);
    expect(s.retreats).toEqual({ blue: 0, coral: 0 });
    expect(experimentMoves(s)).not.toContainEqual({ from: 1, to: 2 });
    expect(() => experimentMove(s, { from: 1, to: 2 })).toThrow('Illegal');
    expect(start.retreats).toEqual({ blue: 1, coral: 1 });
    expect(experimentKey({ ...s, retreats: { blue: 1, coral: 0 } })).not.toBe(experimentKey(s));
  });
  it('allows vertical moves with no retreat remaining', () => {
    const s = newExperiment();
    s.board = ['coral', null, 'blue', null, null, null, null, null, null];
    s.delivered = { blue: 2, coral: 2 };
    s.retreats.blue = 0;
    s.history = [experimentKey(s)];
    expect(isRetreat('blue', { from: 2, to: 5 })).toBe(false);
    expect(experimentMoves(s)).toContainEqual({ from: 2, to: 5 });
    expect(experimentMove(s, { from: 2, to: 5 }).retreats.blue).toBe(0);
  });
  it('delivers the last pawn and ends the match', () => {
    const s = newExperiment();
    s.board = ['coral', 'blue', null, null, null, null, null, null, null];
    s.delivered = { blue: 2, coral: 2 };
    s.history = [experimentKey(s)];
    const next = experimentMove(s, { from: 1, to: 3 });
    expect(next.result).toEqual({ winner: 'blue' });
    expect(next.board[3]).toBeNull();
    expect(next.delivered.blue).toBe(3);
    expect(experimentMoves(next)).toEqual([]);
  });
  it('matches production Classic when both experimental changes are off', () => {
    let original = initialState(),
      lab = newExperiment(false, false);
    for (let i = 0; i < 60 && !original.result; i++) {
      expect(experimentMoves(lab)).toEqual(legalMoves(original));
      const moves = legalMoves(original),
        move = moves[(i * 7) % moves.length];
      original = applyMove(original, move);
      lab = experimentMove(lab, move);
      expect(lab.board).toEqual(original.board);
      expect(lab.delivered).toEqual(original.delivered);
      expect(lab.turn).toBe(original.turn);
      expect(lab.result).toEqual(original.result);
    }
  });
  it('keeps the experimental opponent legal through a full game', () => {
    let s = newExperiment();
    for (let i = 0; i < 100 && !s.result; i++) {
      const move = experimentAI(s);
      expect(move).toBeDefined();
      expect(experimentMoves(s)).toContainEqual(move);
      s = experimentMove(s, move!);
      expect(s.retreats.blue).toBeGreaterThanOrEqual(0);
      expect(s.retreats.coral).toBeGreaterThanOrEqual(0);
      for (const side of ['blue', 'coral'] as const)
        expect(s.board.filter((p) => p === side).length + s.delivered[side]).toBe(3);
    }
    expect(s.result).not.toBeNull();
  });
});
