import { puzzleFor } from '../game/puzzles';
export type PuzzleProgress = Record<string, { bestMoves: number; unassisted: boolean }>;
export function loadPuzzleProgress(): PuzzleProgress {
  try {
    const data = JSON.parse(localStorage.getItem('dama-puzzles-v1') ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return Object.fromEntries(
      Object.entries(data).filter(([id, value]) => {
        const p = puzzleFor(id),
          v = value as PuzzleProgress[string];
        return (
          p &&
          v &&
          Number.isInteger(v.bestMoves) &&
          v.bestMoves > 0 &&
          v.bestMoves <= p.moves &&
          typeof v.unassisted === 'boolean'
        );
      }),
    ) as PuzzleProgress;
  } catch {
    return {};
  }
}
export function recordPuzzle(
  progress: PuzzleProgress,
  id: string,
  moves: number,
  hinted: boolean,
): PuzzleProgress {
  const p = puzzleFor(id);
  if (!p || moves < 1 || moves > p.moves) return progress;
  const previous = progress[id];
  return {
    ...progress,
    [id]: {
      bestMoves: Math.min(previous?.bestMoves ?? Infinity, moves),
      unassisted: !!previous?.unassisted || !hinted,
    },
  };
}
export function savePuzzleProgress(progress: PuzzleProgress): boolean {
  try {
    localStorage.setItem('dama-puzzles-v1', JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
