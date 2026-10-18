import { maps, type MapId } from './maps';
import { puzzles, puzzlesForMap } from './puzzles';
import type { Progress } from '../persistence/progress';
import type { PuzzleProgress } from '../persistence/puzzles';
export interface Achievement {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  earned: boolean;
}
export function achievements(
  journeys: Record<MapId, Progress>,
  solved: PuzzleProgress,
): Achievement[] {
  const mapList = Object.values(maps);
  const wins = mapList.reduce(
    (n, m) => n + Object.values(journeys[m.id].wins).filter((w) => w > 0).length,
    0,
  );
  const completed = puzzles.filter((p) => solved[p.id]).length;
  const clean = mapList
    .map((m) => {
      const pack = puzzlesForMap(m.id);
      return { current: pack.filter((p) => solved[p.id]?.unassisted).length, target: pack.length };
    })
    .sort((a, b) => b.current / b.target - a.current / a.target)[0];
  const list = [
    {
      id: 'first-win',
      title: 'First crossing',
      description: 'Win a Journey match.',
      current: Math.min(1, wins),
      target: 1,
    },
    ...mapList.map((m) => ({
      id: `journey-${m.id}`,
      title: `${m.name} explorer`,
      description: `Beat all three Journey rivals on ${m.name}.`,
      current: Object.values(journeys[m.id].wins).filter((n) => n > 0).length,
      target: 3,
    })),
    ...mapList.map((m) => ({
      id: `pack-${m.id}`,
      title: `${m.name} solver`,
      description: `Solve every puzzle in the ${m.name} pack.`,
      current: puzzlesForMap(m.id).filter((p) => solved[p.id]).length,
      target: puzzlesForMap(m.id).length,
    })),
    {
      id: 'clean-pack',
      title: 'Clear thinking',
      description: 'Solve every puzzle in any one pack without hints. Undo is allowed.',
      ...clean,
    },
    {
      id: 'all-journeys',
      title: 'Every way across',
      description: 'Beat all 18 Journey rivals across the six maps.',
      current: wins,
      target: 18,
    },
    {
      id: 'all-puzzles',
      title: 'Route finder',
      description: 'Solve all 21 puzzles.',
      current: completed,
      target: puzzles.length,
    },
  ];
  return list.map((a) => ({ ...a, earned: a.current >= a.target }));
}
