import { chooseMove, type Difficulty } from './search';
import type { State } from '../game/rules';
self.onmessage = (event: MessageEvent<{ state: State; difficulty: Difficulty }>) => {
  self.postMessage(chooseMove(event.data.state, event.data.difficulty));
};
