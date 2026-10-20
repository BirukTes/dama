import { mapFor, type Edge } from './maps';

export type LabMapId = 'diamond' | 'weave' | 'switchyard';
export const bypasses: Edge[] = [
  [1, 3],
  [1, 5],
  [3, 7],
  [5, 7],
];
const extras: Record<LabMapId, Edge[]> = {
  diamond: bypasses,
  weave: [
    [0, 5],
    [2, 5],
    [2, 7],
    [5, 8],
    [5, 10],
    [7, 10],
  ],
  switchyard: [
    [0, 4],
    [1, 4],
    [8, 4],
    [9, 4],
    [1, 6],
    [2, 6],
    [9, 6],
    [10, 6],
  ],
};
const edgeKey = ([a, b]: Edge) => [a, b].sort((x, y) => x - y).join(':');
function labMap(id: LabMapId, aspect: number) {
  const map = mapFor(id),
    added = new Set(extras[id].map(edgeKey));
  return {
    ...map,
    edges: map.edges.filter((edge) => !added.has(edgeKey(edge))),
    extras: extras[id],
    aspect,
  };
}
// Reuse the shipped graph; the lab may still remove its extra routes for comparison.
export const labMaps = {
  diamond: labMap('diamond', 1),
  weave: labMap('weave', 1.5),
  switchyard: labMap('switchyard', 1.35),
};
