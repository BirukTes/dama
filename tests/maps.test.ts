import { describe, it, expect, vi, afterEach } from 'vitest';
import { maps } from '../src/game/maps';
import { initialState, legalMoves, applyMove, key, type State } from '../src/game/rules';
import { chooseMove } from '../src/ai/search';
import { validState, saveSession, loadSession, type Session } from '../src/persistence/save';
import { recordResult, emptyProgress } from '../src/persistence/progress';
import { puzzles, puzzleState } from '../src/game/puzzles';
afterEach(() => vi.unstubAllGlobals());
describe('Crossroads practice map', () => {
  it('has exactly twelve symmetric orthogonal connections and four centre approaches', () => {
    expect(maps.classic.edges).toHaveLength(16);
    expect(maps.crossroads.edges).toHaveLength(12);
    expect(maps.crossroads.neighbours[4].slice().sort()).toEqual([1, 3, 5, 7]);
    for (const [a, b] of maps.crossroads.edges) {
      expect(Math.abs((a % 3) - (b % 3)) + Math.abs(Math.floor(a / 3) - Math.floor(b / 3))).toBe(1);
      expect(maps.crossroads.neighbours[b]).toContain(a);
    }
  });
  it('rejects diagonal moves, retains deliveries, and preserves the selected map', () => {
    const s = initialState('blue', 'crossroads');
    expect(() => applyMove(s, { from: 2, to: 4 })).toThrow('Illegal move');
    const next = applyMove(s, { from: 2, to: 1 });
    expect(next.map).toBe('crossroads');
    expect(validState(next)).toBe(true);
    const win: State = {
      ...s,
      board: [null, 'coral', null, null, 'blue', null, null, null, null],
      delivered: { blue: 2, coral: 2 },
    };
    win.history = [key(win)];
    expect(() => applyMove(win, { from: 4, to: 0 })).toThrow('Illegal move');
    expect(applyMove(win, { from: 4, to: 3 }).result).toEqual({ winner: 'blue' });
    expect(key(s)).not.toBe(key(initialState()));
  });
  it('keeps every rival legal in seeded complete matches for both starting sides', () => {
    let seed = 623;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (const rival of ['coral', 'runner', 'guardian'] as const)
      for (const start of ['blue', 'coral'] as const) {
        let state = initialState(start, 'crossroads');
        while (!state.result) {
          const moves = legalMoves(state);
          const move =
            state.turn === 'coral'
              ? chooseMove(state, 'standard', random, rival)!
              : moves[Math.floor(random() * moves.length)];
          expect(moves).toContainEqual(move);
          state = applyMove(state, move);
          expect(validState(state)).toBe(true);
          expect(state.map).toBe('crossroads');
        }
        expect(state.turns).toBeLessThanOrEqual(101);
      }
  });
  it('loads legacy Classic saves, rejects mixed-map history/undo, and excludes practice wins from the journey', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const classic: Session = {
      state: initialState(),
      undo: [],
      mode: 'solo',
      starter: 'blue',
      difficulty: 'standard',
    };
    saveSession(classic);
    expect(loadSession()?.state.map).toBeUndefined();
    const s: Session = { ...classic, state: initialState('blue', 'crossroads') };
    saveSession(s);
    expect(loadSession()?.state.map).toBe('crossroads');
    saveSession({ ...s, undo: [initialState()] });
    expect(loadSession()).toBeNull();
    expect(validState({ ...s.state, map: 'missing' })).toBe(false);
    expect(validState({ ...s.state, history: initialState().history })).toBe(false);
    const p = emptyProgress();
    expect(
      recordResult(p, {
        ...s,
        state: { ...s.state, result: { winner: 'blue' } },
        matchId: 'practice',
      }),
    ).toBe(p);
    for (const puzzle of puzzles) expect(puzzleState(puzzle).map).toBeUndefined();
    saveSession({ ...s, puzzleId: puzzles[0].id });
    expect(loadSession('dama-puzzle-session-v1')).toBeNull();
  });
});
