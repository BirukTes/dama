import { describe, expect, it } from 'vitest';
import { lessons, lessonResult } from '../src/game/tutorial';
import { legalMoves } from '../src/game/rules';
import { validState } from '../src/persistence/save';
describe('guided lesson positions', () => {
  it('uses valid states and legal moves without mutating a lesson on replay', () => {
    for (const lesson of lessons) {
      const before = JSON.stringify(lesson.state);
      expect(validState(lesson.state)).toBe(true);
      expect(legalMoves(lesson.state)).toContainEqual(lesson.move);
      expect(validState(lessonResult(lesson))).toBe(true);
      expect(JSON.stringify(lesson.state)).toBe(before);
    }
  });
  it('demonstrates delivery, backwards movement, an automatic pass, and the third-delivery win', () => {
    expect(lessonResult(lessons[2]).delivered.blue).toBe(2);
    expect(lessonResult(lessons[2]).board[3]).toBeNull();
    expect(lessonResult(lessons[3]).board[5]).toBe('blue');
    const pass = lessonResult(lessons[4]);
    expect(pass.turn).toBe('blue');
    expect(pass.turns).toBe(2);
    expect(legalMoves(pass, 'coral')).toHaveLength(0);
    expect(lessonResult(lessons[5]).result).toEqual({ winner: 'blue' });
  });
});
