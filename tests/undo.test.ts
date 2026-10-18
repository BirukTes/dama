import { expect, it } from 'vitest';
import { allowsUndo } from '../src/persistence/progress';
import { initialState } from '../src/game/rules';
import type { Session } from '../src/persistence/save';
it('protects Journey turns, including legacy Classic, and permits practice and puzzles', () => {
  const s: Session = {
    state: initialState(),
    mode: 'solo',
    difficulty: 'standard',
    starter: 'blue',
    undo: [],
  };
  expect(allowsUndo(s)).toBe(false);
  expect(allowsUndo({ ...s, track: 'journey' })).toBe(false);
  expect(allowsUndo({ ...s, track: 'free-play' })).toBe(true);
  expect(allowsUndo({ ...s, mode: 'local' })).toBe(true);
  expect(allowsUndo({ ...s, puzzleId: 'last-step' })).toBe(true);
  expect(allowsUndo({ ...s, state: initialState('blue', 'crossroads') })).toBe(true);
});
