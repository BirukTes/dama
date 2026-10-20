import { mkdirSync, writeFileSync } from 'node:fs';
import { chooseMove } from '../src/ai/search.ts';
import { maps } from '../src/game/maps.ts';
import { opponents } from '../src/game/opponents.ts';
import { applyMove, initialState, legalMoves } from '../src/game/rules.ts';

// Reproducible desktop timing/depth sample, not a human difficulty or win-rate claim.
const report = [];
mkdirSync('.inspection', { recursive: true });
for (const map of Object.values(maps))
  for (const opponent of opponents)
    for (const restricted of [false, true]) {
      const opening = initialState('blue', map.id, restricted);
      const state = applyMove(opening, legalMoves(opening)[0]);
      if (state.result) continue;
      for (const difficulty of ['standard', 'expert']) {
        const stats = { nodes: 0, completedDepth: 0 },
          start = performance.now();
        const move = chooseMove(state, difficulty, () => 0.5, opponent.id, stats);
        report.push({
          map: map.id,
          opponent: opponent.id,
          movement: restricted ? 'one-retreat' : 'classic',
          difficulty,
          move,
          ...stats,
          ms: Math.round(performance.now() - start),
        });
      }
    }
writeFileSync('.inspection/expert-benchmark.json', JSON.stringify(report, null, 2));
for (const difficulty of ['standard', 'expert']) {
  const samples = report.filter((r) => r.difficulty === difficulty),
    times = samples.map((r) => r.ms).sort((a, b) => a - b);
  console.log(
    difficulty,
    JSON.stringify({
      decisions: samples.length,
      medianMs: times[Math.floor(times.length / 2)],
      maxMs: times.at(-1),
      minDepth: Math.min(...samples.map((r) => r.completedDepth)),
      maxDepth: Math.max(...samples.map((r) => r.completedDepth)),
    }),
  );
}
