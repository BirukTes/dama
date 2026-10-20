import { describe, expect, it } from 'vitest';
import { initialState, legalMoves, applyMove, key, isBackward } from '../src/game/rules';
import { maps } from '../src/game/maps';
import { chooseMove } from '../src/ai/search';
import { validState, parseSession } from '../src/persistence/save';
import { recordResult, emptyProgress, isJourney } from '../src/persistence/progress';
import { parseBackup } from '../src/persistence/backup';

describe('One Retreat in Free play', () => {
  it('spends allowances independently, restores through undo and prevents a second retreat', () => {
    let s = initialState('blue', 'classic', true);
    const original = s;
    for (const move of [
      { from: 2, to: 1 },
      { from: 3, to: 4 },
      { from: 1, to: 2 },
      { from: 4, to: 3 },
      { from: 2, to: 1 },
      { from: 3, to: 4 },
    ])
      s = applyMove(s, move);
    expect(s.retreats).toEqual({ blue: 0, coral: 0 });
    expect(original.retreats).toEqual({ blue: 1, coral: 1 });
    expect(legalMoves(s)).not.toContainEqual({ from: 1, to: 2 });
    expect(() => applyMove(s, { from: 1, to: 2 })).toThrow();
    expect(key({ ...s, retreats: { blue: 1, coral: 0 } })).not.toBe(key(s));
    expect(validState(s)).toBe(true);
  });
  it('round-trips restricted sessions and backups, rejects Journey/puzzle and mixed-rule undo saves', () => {
    const state = initialState('blue', 'diamond', true),
      session = {
        version: 1,
        state,
        mode: 'solo',
        track: 'free-play',
        difficulty: 'standard',
        starter: 'blue',
        undo: [],
        matchId: 'retreat',
      };
    expect(parseSession(JSON.stringify(session))?.state).toEqual(state);
    expect(parseSession(JSON.stringify({ ...session, track: 'journey' }))).toBeNull();
    expect(
      parseSession(JSON.stringify({ ...session, undo: [initialState('blue', 'diamond')] })),
    ).toBeNull();
    expect(parseSession(JSON.stringify({ ...session, puzzleId: 'diamond-1' }))).toBeNull();
    expect(
      parseSession(
        JSON.stringify({ ...session, state: { ...state, retreats: { blue: 2, coral: 1 } } }),
      ),
    ).toBeNull();
    const parsed = parseSession(JSON.stringify(session))!;
    expect(isJourney(parsed)).toBe(false);
    const progress = emptyProgress();
    expect(
      recordResult(progress, { ...parsed, state: { ...state, result: { winner: 'blue' } } }),
    ).toBe(progress);
    const backup = {
      format: 'dama-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      entries: {
        'dama-session-v1': JSON.stringify(session),
        'dama-home-choice-v1': JSON.stringify({ movement: 'one-retreat', map: 'diamond' }),
      },
    };
    expect(parseBackup(JSON.stringify(backup)).entries).toEqual(backup.entries);
    expect(key(initialState())).not.toContain(':r');
  });
  for (const map of Object.values(maps))
    it(`${map.name}: all rivals obey the same restriction and preserve valid states`, () => {
      for (const opponent of ['coral', 'runner', 'guardian'] as const) {
        let s = initialState(opponent === 'runner' ? 'coral' : 'blue', map.id, true);
        for (let i = 0; i < 12 && !s.result; i++) {
          const moves = legalMoves(s);
          const move = chooseMove(s, 'gentle', () => 0.6, opponent)!;
          expect(moves).toContainEqual(move);
          if (s.retreats![s.turn] === 0) expect(isBackward(s, s.turn, move)).toBe(false);
          s = applyMove(s, move);
          expect(validState(s)).toBe(true);
        }
      }
    });
});
