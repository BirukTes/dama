import { chooseMove, type Difficulty } from './search';
import type { State } from '../game/rules';
import type { OpponentId } from '../game/opponents';
import { choosePuzzleReply } from '../game/puzzle-solver';
self.onmessage = (
  event: MessageEvent<{
    state: State;
    difficulty: Difficulty;
    opponent?: OpponentId;
    puzzleMoves?: number;
  }>,
) => {
  self.postMessage(
    event.data.puzzleMoves !== undefined
      ? choosePuzzleReply(event.data.state, event.data.puzzleMoves)
      : chooseMove(event.data.state, event.data.difficulty, Math.random, event.data.opponent),
  );
};
