export type MapId = 'classic' | 'crossroads';
type Edge = [number, number];
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
const make = (id: MapId, name: string, description: string, centre: number[]) => {
  const edges: Edge[] = [...perimeter, ...centre.map((n) => [4, n] as Edge)];
  const neighbours = Array.from({ length: 9 }, (_, n) =>
    edges.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])),
  );
  return { id, name, description, edges, neighbours };
};
export const maps = {
  classic: make(
    'classic',
    'Classic',
    'The original board: the centre connects to all eight surrounding spots.',
    [0, 1, 2, 3, 5, 6, 7, 8],
  ),
  crossroads: make(
    'crossroads',
    'Crossroads',
    'Horizontal and vertical connections only. Plan through the junction or around the edge.',
    [1, 3, 5, 7],
  ),
};
export const isMapId = (id: unknown): id is MapId => id === 'classic' || id === 'crossroads';
export const mapFor = (id: MapId = 'classic') => maps[id];
