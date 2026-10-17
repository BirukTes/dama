import { initialState, legalMoves, applyMove } from '../game/rules';
import { opponents } from '../game/opponents';
import { chooseMove } from '../ai/search';
import { referenceMove } from './reference-policy';

const gamesPerRival = 24;
const report = opponents.map(({ id }) => {
  const result = { wins: 0, losses: 0, draws: 0, turns: 0 };
  const decisions: number[] = [],
    openings = new Set<string>();
  for (let game = 0; game < gamesPerRival; game++) {
    let seed = 1729 + game;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let s = initialState(game % 2 ? 'coral' : 'blue');
    while (!s.result) {
      let move;
      if (s.turn === 'coral') {
        const start = performance.now();
        move = chooseMove(s, 'standard', random, id)!;
        decisions.push(performance.now() - start);
        if (s.turns < 2) openings.add(`${move.from}-${move.to}`);
      } else {
        const moves = legalMoves(s);
        move = random() < 0.2 ? moves[Math.floor(random() * moves.length)] : referenceMove(s)!;
      }
      s = applyMove(s, move);
    }
    const winner = 'winner' in s.result ? s.result.winner : null;
    result[winner === 'coral' ? 'wins' : winner ? 'losses' : 'draws']++;
    result.turns += s.turns;
  }
  decisions.sort((a, b) => a - b);
  return {
    id,
    games: gamesPerRival,
    ...result,
    meanTurns: Number((result.turns / gamesPerRival).toFixed(1)),
    openingChoices: openings.size,
    p95DecisionMs: Number(decisions[Math.floor(decisions.length * 0.95)].toFixed(1)),
  };
});
console.log(
  JSON.stringify(
    {
      method:
        'Standard rivals vs a frozen three-ply balanced Blue policy with 20% seeded random moves; seeds 1729–1752, alternating starters. Timing depends on the device. This is a controlled regression sample, not a human difficulty rating.',
      report,
    },
    null,
    2,
  ),
);
