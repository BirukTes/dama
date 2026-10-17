import { applyMove, legalMoves, key, type State, type Move } from './rules';

// Exact bounded proof: Blue chooses a route; every legal Coral reply must allow it.
// History is part of the key because a repeated board can have a different outcome.
export function puzzleSolver() {
  const memo = new Map<string, boolean>();
  function canWin(s: State, moves: number): boolean {
    if (s.result) return 'winner' in s.result && s.result.winner === 'blue';
    if (moves <= 0) return false;
    const k = `${key(s)}|${moves}|${s.turns}|${s.history.join(',')}`;
    const cached = memo.get(k);
    if (cached !== undefined) return cached;
    const children = legalMoves(s).map((m) => applyMove(s, m));
    const blue = s.turn === 'blue';
    const result =
      children.length > 0 &&
      (blue
        ? children.some((next) => canWin(next, moves - 1))
        : children.every((next) => canWin(next, moves)));
    memo.set(k, result);
    return result;
  }
  return {
    canWin,
    winningMoves: (s: State, moves: number): Move[] =>
      s.turn !== 'blue' || moves <= 0
        ? []
        : legalMoves(s).filter((m) => canWin(applyMove(s, m), moves - 1)),
  };
}
export function choosePuzzleReply(s: State, moves: number): Move | null {
  const options = legalMoves(s);
  if (!options.length) return null;
  const { canWin } = puzzleSolver();
  // Punish a missed solution if possible; otherwise choose the reply that delays it most.
  let chosen = options[0],
    difficulty = -1;
  for (const move of options) {
    const next = applyMove(s, move);
    let required = 0;
    while (required <= moves && !canWin(next, required)) required++;
    if (required > difficulty) {
      chosen = move;
      difficulty = required;
    }
  }
  return chosen;
}
