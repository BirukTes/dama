import { chooseMove, type Difficulty } from './search';
import type { State } from '../game/rules';
import type { OpponentId } from '../game/opponents';
self.onmessage = (
  event: MessageEvent<{ state: State; difficulty: Difficulty; opponent?: OpponentId }>,
) => {
  self.postMessage(
    chooseMove(event.data.state, event.data.difficulty, Math.random, event.data.opponent),
  );
};
