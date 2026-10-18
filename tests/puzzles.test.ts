import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  puzzles,
  classicPuzzles,
  puzzlesForMap,
  puzzleState,
  puzzleOutcome,
} from '../src/game/puzzles';
import { maps } from '../src/game/maps';
import { mapPuzzleWitnesses } from './map-puzzle-witnesses';
import { puzzleSolver, choosePuzzleReply } from '../src/game/puzzle-solver';
import { applyMove, initialState, key, legalMoves, type State } from '../src/game/rules';
import { validState, loadSession, saveSession, type Session } from '../src/persistence/save';
import { recordResult, emptyProgress } from '../src/persistence/progress';
import { recordPuzzle, loadPuzzleProgress, savePuzzleProgress } from '../src/persistence/puzzles';
afterEach(() => vi.unstubAllGlobals());
describe('authored puzzles', () => {
  it('contains six distinct, legal positions reachable under the original rules', () => {
    const queue = [initialState(), initialState('coral')],
      seen = new Set(queue.map(key));
    for (let i = 0; i < queue.length; i++)
      for (const move of legalMoves(queue[i])) {
        const next = applyMove(queue[i], move);
        next.turns = 0;
        next.history = [key(next)];
        if (!seen.has(key(next))) {
          seen.add(key(next));
          queue.push(next);
        }
      }
    expect(classicPuzzles).toHaveLength(6);
    expect(new Set(puzzles.map((p) => key(puzzleState(p)))).size).toBe(puzzles.length);
    for (const p of classicPuzzles) {
      expect(validState(puzzleState(p))).toBe(true);
      expect(seen.has(key(puzzleState(p)))).toBe(true);
    }
  });
  it('provides legal map-specific packs whose new positions have replayable reachability witnesses', () => {
    expect(puzzles).toHaveLength(21);
    for (const map of Object.values(maps)) {
      expect(puzzlesForMap(map.id)).toHaveLength(map.id === 'classic' ? 6 : 3);
      for (const p of puzzlesForMap(map.id)) {
        expect(validState(puzzleState(p))).toBe(true);
        if (map.id === 'classic') continue;
        let state = initialState('blue', map.id);
        for (const move of mapPuzzleWitnesses[p.id]) state = applyMove(state, move);
        expect(key(state)).toBe(key(puzzleState(p)));
        expect(state.result).toBeNull();
      }
    }
  });
  for (const p of puzzles)
    it(`${p.title}: wins against every reply within the stated, minimal budget`, () => {
      const solver = puzzleSolver(),
        start = puzzleState(p);
      expect(solver.canWin(start, p.moves)).toBe(true);
      expect(solver.canWin(start, p.moves - 1)).toBe(false);
      let branches = 0;
      function verify(s: State, remaining: number): void {
        expect(validState(s)).toBe(true);
        if (s.result) {
          expect(s.result).toEqual({ winner: 'blue' });
          return;
        }
        expect(remaining).toBeGreaterThan(0);
        if (s.turn === 'blue') {
          const move = solver.winningMoves(s, remaining)[0];
          expect(move).toBeDefined();
          verify(applyMove(s, move), remaining - 1);
        } else
          for (const move of legalMoves(s)) {
            branches++;
            verify(applyMove(s, move), remaining);
          }
      }
      verify(start, p.moves);
      if (p.moves > 1) expect(branches).toBeGreaterThan(p.map ? 0 : 1);
      const bad = legalMoves(start).find(
        (m) => !solver.winningMoves(start, p.moves).some((w) => m.from === w.from && m.to === w.to),
      );
      expect(bad).toBeDefined();
      const after = applyMove(start, bad!);
      if (!after.result && after.turn === 'coral') {
        const reply = choosePuzzleReply(after, p.moves - 1)!;
        expect(solver.canWin(applyMove(after, reply), p.moves - 1)).toBe(false);
      }
    });
  it('fails on the move limit and separates puzzle completion from rival unlocks and match saves', () => {
    const p = puzzles[0],
      state = puzzleState(p);
    expect(puzzleOutcome(state, p, 0)).toBeNull();
    expect(puzzleOutcome(state, p, 1)).toBe('failed');
    const solved = applyMove(state, { from: 7, to: 6 });
    expect(puzzleOutcome(solved, p, 1)).toBe('solved');
    const session: Session = {
      state: solved,
      mode: 'solo',
      difficulty: 'standard',
      starter: 'blue',
      undo: [state],
      matchId: 'puzzle-test',
      puzzleId: p.id,
    };
    const progress = emptyProgress();
    expect(recordResult(progress, session)).toBe(progress);
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    const normal = { ...session, state: initialState(), undo: [], puzzleId: undefined };
    saveSession(normal);
    saveSession(session);
    expect(loadSession()?.state).toEqual(normal.state);
    expect(loadSession('dama-puzzle-session-v1')?.puzzleId).toBe(p.id);
    const hinted = recordPuzzle({}, p.id, 1, true);
    expect(recordPuzzle(hinted, p.id, 1, false)[p.id].unassisted).toBe(true);
    savePuzzleProgress(hinted);
    expect(loadPuzzleProgress()).toEqual(hinted);
    store.set('dama-puzzles-v1', '{"last-step":{"bestMoves":99,"unassisted":true}}');
    expect(loadPuzzleProgress()).toEqual({});
  });
});
