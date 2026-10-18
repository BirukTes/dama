import { maps, mapFor } from '../game/maps';
import { initialState, legalMoves, applyMove, type State, type Side } from '../game/rules';
import { opponents } from '../game/opponents';
import { chooseMove, type Difficulty } from '../ai/search';
const games = 2;
function distance(s: State, n: number, side: Side): number {
  const map = mapFor(s.map),
    seen = new Set([n]);
  let wave = [n];
  for (let d = 0; wave.length; d++) {
    if (wave.some((n) => map.goals[side].includes(n))) return d;
    wave = wave
      .flatMap((n) => map.neighbours[n])
      .filter((n) => {
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
  }
  return 99;
}
// A fixed one-ply distance/delivery baseline. It never calls a live rival policy.
function baseline(s: State, random: () => number) {
  const moves = legalMoves(s);
  if (random() < 0.2) return moves[Math.floor(random() * moves.length)];
  const value = (next: State) =>
    next.result
      ? 'winner' in next.result
        ? next.result.winner === 'blue'
          ? 10000
          : -10000
        : 0
      : 100 * (next.delivered.blue - next.delivered.coral) -
        next.board.reduce(
          (v, p, n) =>
            v +
            (p === 'blue'
              ? distance(next, n, 'blue')
              : p === 'coral'
                ? -distance(next, n, 'coral')
                : 0),
          0,
        ) *
          12;
  return moves.map((m) => ({ m, v: value(applyMove(s, m)) })).sort((a, b) => b.v - a.v)[0].m;
}
const report = [];
for (const map of Object.values(maps))
  for (const opponent of opponents)
    for (const difficulty of ['gentle', 'standard'] as Difficulty[]) {
      const totals = { wins: 0, losses: 0, draws: 0, turns: 0 },
        times: number[] = [];
      for (let game = 0; game < games; game++) {
        let seed = 1729 + game;
        const random = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        let s = initialState(game % 2 ? 'coral' : 'blue', map.id);
        while (!s.result) {
          const start = performance.now();
          const move =
            s.turn === 'coral'
              ? chooseMove(s, difficulty, random, opponent.id)!
              : baseline(s, random);
          if (s.turn === 'coral') times.push(performance.now() - start);
          s = applyMove(s, move);
        }
        const winner = 'winner' in s.result ? s.result.winner : null;
        totals[winner === 'coral' ? 'wins' : winner ? 'losses' : 'draws']++;
        totals.turns += s.turns;
      }
      times.sort((a, b) => a - b);
      report.push({
        map: map.id,
        rival: opponent.id,
        difficulty,
        games,
        wins: totals.wins,
        losses: totals.losses,
        draws: totals.draws,
        meanTurns: Number((totals.turns / games).toFixed(1)),
        p95DecisionMs: Number((times[Math.floor(times.length * 0.95)] ?? 0).toFixed(1)),
      });
    }
console.log(
  JSON.stringify(
    {
      method:
        'Rival results vs fixed one-ply distance/delivery Blue policy with 20% seeded random moves; seeds 1729 onward, alternating starters. Small regression sample, not human difficulty or a strength ordering. Decision timings are this PC only.',
      report,
    },
    null,
    2,
  ),
);
