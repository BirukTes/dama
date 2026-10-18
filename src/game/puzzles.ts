import { key, type State } from './rules';
import { mapPuzzles } from './map-puzzles';
import type { MapId } from './maps';

export interface Puzzle {
  map?: MapId;
  id: string;
  title: string;
  theme: string;
  moves: number;
  board: State['board'];
  delivered: State['delivered'];
  hint: string;
  explanation: string;
}
export const classicPuzzles: Puzzle[] = [
  {
    id: 'last-step',
    title: 'One last step',
    theme: 'Spot the finish',
    moves: 1,
    board: [null, null, null, null, 'coral', null, null, 'blue', null],
    delivered: { blue: 2, coral: 2 },
    hint: 'Your final pawn is already beside the goal edge. You do not need the centre.',
    explanation:
      'Bottom middle connects directly to bottom left. Deliver there before Coral gets another turn. Any spot on the opposing edge counts.',
  },
  {
    id: 'centre-stop',
    title: 'A stop along the way',
    theme: 'Plan two moves',
    moves: 2,
    board: [null, null, null, 'coral', null, 'blue', null, null, null],
    delivered: { blue: 2, coral: 2 },
    hint: 'The centre takes one move to reach. From there, keep more than one exit available.',
    explanation:
      'Move from middle right into the centre first. Coral cannot occupy every left-edge exit in one turn, so your next move can deliver. Crossing the centre takes two separate moves.',
  },
  {
    id: 'right-order',
    title: 'The right order',
    theme: 'Choose which pawn',
    moves: 2,
    board: ['coral', null, null, 'coral', 'blue', null, null, 'blue', null],
    delivered: { blue: 1, coral: 1 },
    hint: 'One pawn has only one direct exit. Deliver that pawn before moving the flexible one.',
    explanation:
      'Deliver bottom middle to bottom left first. Starting with the centre pawn lets Coral block the remaining pawn’s quick exit. After the bottom delivery, the centre pawn still has a way home.',
  },
  {
    id: 'open-route',
    title: 'Keep a route open',
    theme: 'Timing over speed',
    moves: 3,
    board: [null, null, null, null, null, 'blue', 'coral', 'blue', null],
    delivered: { blue: 1, coral: 2 },
    hint: 'The bottom-left exit is occupied. Give the right-hand pawn access to several exits.',
    explanation:
      'Bring middle right into the centre. With the bottom route guarded, the centre gives you alternatives and prevents Coral taking it first. Choose the remaining deliveries according to Coral’s reply.',
  },
  {
    id: 'between-guards',
    title: 'Between the guards',
    theme: 'Find another route',
    moves: 4,
    board: ['coral', null, null, null, 'blue', null, 'coral', null, 'blue'],
    delivered: { blue: 1, coral: 1 },
    hint: 'There is one free goal between the guards. Use it before planning the last pawn’s route.',
    explanation:
      'Deliver the centre pawn to middle left first. Top left and bottom left are guarded. The remaining pawn may need a route around the perimeter when Coral occupies the centre; respond to the guard rather than repeating the same approach.',
  },
  {
    id: 'comeback',
    title: 'The comeback',
    theme: 'Behind is not beaten',
    moves: 4,
    board: [null, 'blue', null, null, null, 'blue', 'coral', 'blue', null],
    delivered: { blue: 0, coral: 2 },
    hint: 'An immediate point is tempting. First stop Coral claiming the centre.',
    explanation:
      'Move middle right into the centre before taking the easy top-left delivery. Controlling the centre denies Coral its fastest route. You can then deliver all three pawns within four of your moves, even from 0–2 down.',
  },
];
export const puzzles: Puzzle[] = [...classicPuzzles, ...mapPuzzles];
export const puzzlesForMap = (map: MapId) => puzzles.filter((p) => (p.map ?? 'classic') === map);
export const puzzleFor = (id: string | undefined) => puzzles.find((p) => p.id === id);
export function puzzleState(p: Puzzle): State {
  const s: State = {
    ...(p.map ? { map: p.map } : {}),
    board: [...p.board],
    delivered: { ...p.delivered },
    turn: 'blue',
    turns: 0,
    history: [],
    result: null,
  };
  s.history = [key(s)];
  return s;
}
export function puzzleOutcome(s: State, p: Puzzle, movesUsed: number): 'solved' | 'failed' | null {
  if (s.result)
    return 'winner' in s.result && s.result.winner === 'blue' && movesUsed <= p.moves
      ? 'solved'
      : 'failed';
  return movesUsed >= p.moves ? 'failed' : null;
}
