import { expect, it } from 'vitest';
import { achievements } from '../src/game/achievements';
import { maps, type MapId } from '../src/game/maps';
import { emptyProgress } from '../src/persistence/progress';
import { puzzlesForMap } from '../src/game/puzzles';
import type { PuzzleProgress } from '../src/persistence/puzzles';
it('derives achievements from records without granting unlocks or counting Free play data', () => {
  const journeys = Object.fromEntries(
    Object.keys(maps).map((id) => [id, emptyProgress()]),
  ) as Record<MapId, ReturnType<typeof emptyProgress>>;
  expect(achievements(journeys, {}).filter((a) => a.earned)).toHaveLength(0);
  journeys.classic.wins.coral = 99;
  expect(achievements(journeys, {}).find((a) => a.id === 'first-win')?.earned).toBe(true);
  expect(achievements(journeys, {}).find((a) => a.id === 'all-journeys')?.current).toBe(1);
  const solved: PuzzleProgress = Object.fromEntries(
    puzzlesForMap('islands').map((p) => [p.id, { bestMoves: p.moves, unassisted: true }]),
  );
  const before = JSON.stringify(journeys);
  expect(achievements(journeys, solved).find((a) => a.id === 'clean-pack')?.earned).toBe(true);
  expect(achievements(journeys, solved).find((a) => a.id === 'pack-islands')?.earned).toBe(true);
  expect(
    achievements(journeys, { ...solved, 'islands-2': { bestMoves: 2, unassisted: false } }).find(
      (a) => a.id === 'clean-pack',
    )?.earned,
  ).toBe(false);
  expect(JSON.stringify(journeys)).toBe(before);
  expect(achievements(JSON.parse(before), JSON.parse(JSON.stringify(solved)))).toEqual(
    achievements(journeys, solved),
  );
});
