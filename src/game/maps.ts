export type MapId =
  'classic' | 'crossroads' | 'ring-road' | 'twin-bridges' | 'long-crossing' | 'islands';
export type Edge = [number, number];
type Spots = { blue: number[]; coral: number[] };
export interface BoardMap {
  id: MapId;
  name: string;
  description: string;
  points: number[][];
  names: string[];
  edges: Edge[];
  neighbours: number[][];
  starts: Spots;
  goals: Spots;
  junctions: number[];
  wide: boolean;
}
const gridPoints = (columns: number) =>
  Array.from({ length: columns * 3 }, (_, n) => [
    80 + ((n % columns) * 340) / (columns - 1),
    80 + Math.floor(n / columns) * 170,
  ]);
const gridNames = (columns: number) =>
  Array.from({ length: columns * 3 }, (_, n) => {
    const row = ['top', 'middle', 'bottom'][Math.floor(n / columns)],
      col = n % columns;
    if (columns === 3 && n === 4) return 'centre';
    return `${row} ${col === 0 ? 'left' : col === columns - 1 ? 'right' : columns === 3 ? 'middle' : `column ${col + 1}`}`;
  });
const gridEdges = (columns: number): Edge[] =>
  Array.from({ length: columns * 3 }, (_, n) => [
    ...(n % columns < columns - 1 ? [[n, n + 1] as Edge] : []),
    ...(n < columns * 2 ? [[n, n + columns] as Edge] : []),
  ]).flat();
const make = (
  id: MapId,
  name: string,
  description: string,
  points: number[][],
  names: string[],
  edges: Edge[],
  left: number[],
  right: number[],
  junctions: number[],
  wide = false,
): BoardMap => ({
  id,
  name,
  description,
  points,
  names,
  edges,
  junctions,
  wide,
  neighbours: points.map((_, n) => edges.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : []))),
  starts: { coral: left, blue: right },
  goals: { blue: left, coral: right },
});
const perimeter: Edge[] = [
  [0, 1],
  [1, 2],
  [2, 5],
  [5, 8],
  [8, 7],
  [7, 6],
  [6, 3],
  [3, 0],
];
const original = (id: MapId, name: string, description: string, centre: number[]) =>
  make(
    id,
    name,
    description,
    gridPoints(3),
    gridNames(3),
    [...perimeter, ...centre.map((n) => [4, n] as Edge)],
    [0, 3, 6],
    [2, 5, 8],
    [4],
  );
export const maps: Record<MapId, BoardMap> = {
  classic: original(
    'classic',
    'Classic',
    'The original board: the centre connects to all eight surrounding spots.',
    [0, 1, 2, 3, 5, 6, 7, 8],
  ),
  crossroads: original(
    'crossroads',
    'Crossroads',
    'Horizontal and vertical connections only. Plan through the junction or around the edge.',
    [1, 3, 5, 7],
  ),
  'ring-road': original(
    'ring-road',
    'Ring Road',
    'Cross by the top or bottom road. The centre links those roads but has no sideways exits.',
    [1, 7],
  ),
  'twin-bridges': make(
    'twin-bridges',
    'Twin Bridges',
    'Two crossings join the banks. Switch between the upper and lower bridge.',
    gridPoints(4),
    gridNames(4),
    gridEdges(4).filter(([a, b]) => !(a === 5 && b === 6)),
    [0, 4, 8],
    [3, 7, 11],
    [1, 2, 9, 10],
    true,
  ),
  'long-crossing': make(
    'long-crossing',
    'Long Crossing',
    'Three lanes and a longer journey. Spread your pawns across the wider board.',
    gridPoints(5),
    gridNames(5),
    gridEdges(5),
    [0, 5, 10],
    [4, 9, 14],
    [2, 7, 12],
    true,
  ),
  islands: make(
    'islands',
    'Islands',
    'Two banks share a narrow bridge and a passing bay. Use the bay to let opposing pawns pass.',
    [
      [80, 80],
      [80, 250],
      [80, 420],
      [190, 250],
      [310, 250],
      [420, 80],
      [420, 250],
      [420, 420],
      [250, 385],
    ],
    [
      'top left',
      'middle left',
      'bottom left',
      'left landing',
      'right landing',
      'top right',
      'middle right',
      'bottom right',
      'passing bay',
    ],
    [
      [0, 1],
      [1, 2],
      [5, 6],
      [6, 7],
      [0, 3],
      [2, 3],
      [5, 4],
      [7, 4],
      [3, 4],
      [3, 8],
      [4, 8],
    ],
    [0, 1, 2],
    [5, 6, 7],
    [3, 4, 8],
    true,
  ),
};
export const isMapId = (id: unknown): id is MapId =>
  typeof id === 'string' && Object.hasOwn(maps, id);
export const mapFor = (id: MapId = 'classic') => maps[id];
export function nextSpot(id: MapId | undefined, from: number, key: string): number {
  const points = mapFor(id).points,
    axis = key === 'ArrowLeft' || key === 'ArrowRight' ? 0 : 1,
    cross = 1 - axis;
  const sign = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1,
    current = points[from];
  const candidates = points
    .map((p, n) => ({
      n,
      forward: (p[axis] - current[axis]) * sign,
      offset: Math.abs(p[cross] - current[cross]),
    }))
    .filter((p) => p.n !== from);
  const forward = candidates.filter((p) => p.forward > 0.1);
  const pool = forward.length ? forward : candidates;
  pool.sort((a, b) => a.offset - b.offset || a.forward - b.forward);
  return pool[0]?.n ?? from;
}
