import { describe, expect, it } from 'vitest';
import { chooseMove } from '../src/ai/search';
import { puzzles, puzzleState } from '../src/game/puzzles';
import { puzzleSolver } from '../src/game/puzzle-solver';
import { initialState, applyMove, legalMoves } from '../src/game/rules';
import { maps } from '../src/game/maps';
import { parseSession } from '../src/persistence/save';
import { parseBackup } from '../src/persistence/backup';

describe('Expert difficulty', () => {
  for (const id of ['between-guards', 'comeback'])
    it(`${id}: finds a guaranteed finish within the budget missed by Standard Coral`, () => {
      const p = puzzles.find((p) => p.id === id)!,
        s = puzzleState(p),
        proof = puzzleSolver();
      const standard = chooseMove(s, 'standard', () => 0.5, 'coral')!,
        stats = { nodes: 0, completedDepth: 0 };
      const expert = chooseMove(s, 'expert', () => 0.5, 'coral', stats)!;
      expect(proof.canWin(applyMove(s, expert), p.moves - 1)).toBe(true);
      expect(proof.canWin(applyMove(s, standard), p.moves - 1)).toBe(false);
      expect(stats.completedDepth).toBeGreaterThan(3);
    });
  for (const map of Object.values(maps))
    it(`${map.name}: keeps search bounded and follows either movement rule`, () => {
      for (const restricted of [false, true]) {
        const s = initialState('coral', map.id, restricted),
          snapshot = JSON.stringify(s),
          stats = { nodes: 0, completedDepth: 0 };
        const move = chooseMove(s, 'expert', () => 0.5, 'guardian', stats);
        expect(legalMoves(s)).toContainEqual(move);
        expect(stats.nodes).toBeLessThanOrEqual(96001);
        expect(stats.completedDepth).toBeGreaterThan(0);
        expect(JSON.stringify(s)).toBe(snapshot);
      }
    }, 15000);
  it('persists Expert without enabling a movement rule, including backups', () => {
    const session = {
      version: 1,
      state: initialState(),
      mode: 'solo',
      track: 'journey',
      difficulty: 'expert',
      starter: 'blue',
      undo: [],
      matchId: 'expert-test',
    };
    const parsed = parseSession(JSON.stringify(session));
    expect(parsed?.difficulty).toBe('expert');
    expect(parsed?.state.retreats).toBeUndefined();
    const backup = {
      format: 'dama-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      entries: {
        'dama-session-v1': JSON.stringify(session),
        'dama-home-choice-v1': JSON.stringify({ difficulty: 'expert', movement: 'classic' }),
      },
    };
    expect(parseBackup(JSON.stringify(backup)).entries).toEqual(backup.entries);
    expect(parseSession(JSON.stringify({ ...session, difficulty: 'unknown' }))).toBeNull();
    for (const difficulty of ['gentle', 'standard'])
      expect(parseSession(JSON.stringify({ ...session, difficulty }))?.difficulty).toBe(difficulty);
  });
});
