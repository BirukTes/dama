import { initialState, key, applyMove, type State, type Move } from './rules';

export interface Lesson {
  title: string;
  instruction: string;
  state: State;
  move: Move;
  feedback: string;
}
function position(board: State['board'], blue: number, coral: number): State {
  const state = { ...initialState(), board, delivered: { blue, coral } };
  state.history = [key(state)];
  return state;
}
export const lessons: Lesson[] = [
  {
    title: 'Follow a connection',
    instruction:
      'You are Blue, moving from right to left. Drag the glowing top-right pawn to the outlined top-middle spot, or tap the pawn then its destination.',
    state: initialState(),
    move: { from: 2, to: 1 },
    feedback:
      'One connection, one move. In a match, Coral normally moves next. No jumping or capturing is allowed.',
  },
  {
    title: 'The centre is a stop',
    instruction:
      'Move Blue from middle right into the centre. A line through the centre is two connections: you must stop there first.',
    state: position([null, 'coral', null, null, null, 'blue', null, null, null], 2, 2),
    move: { from: 5, to: 4 },
    feedback:
      'You stopped at the centre. Reaching the left edge from here would take another move on a later turn.',
  },
  {
    title: 'Deliver a pawn',
    instruction:
      'Blue scores on the left edge. Move the centre pawn to middle left. Watch the delivery count when it leaves the board.',
    state: position([null, null, null, null, 'blue', 'blue', null, 'coral', null], 1, 2),
    move: { from: 4, to: 3 },
    feedback:
      'Delivered! Blue now has 2 of 3. The pawn leaves the board and frees that goal for another delivery.',
  },
  {
    title: 'You can step backwards',
    instruction:
      'Move Blue from the centre to middle right, away from its goal. Retreating can free a route or avoid a repeated position.',
    state: position([null, 'coral', null, null, 'blue', null, null, null, null], 2, 2),
    move: { from: 4, to: 5 },
    feedback:
      'Backwards moves are legal. They use a turn, just like a forward move. Three repeats of a position end the match in a draw.',
  },
  {
    title: 'Blocking causes a pass',
    instruction:
      'Move Blue from middle right into the centre. Coral’s three pawns will have no empty connected spot.',
    state: position(['coral', 'blue', null, 'coral', null, 'blue', 'coral', 'blue', null], 0, 0),
    move: { from: 5, to: 4 },
    feedback:
      'Coral is blocked and passes automatically. Blue moves again! If neither side can move, the match is a draw. There is also a 100-turn limit, including passes.',
  },
  {
    title: 'Deliver all three to win',
    instruction:
      'Blue has already delivered two pawns. Move its last pawn from the centre to middle left to finish the match.',
    state: position([null, null, null, null, 'blue', null, null, 'coral', null], 2, 2),
    move: { from: 4, to: 3 },
    feedback:
      'Three delivered: Blue wins. A finished match can be reviewed or rematched. The same rules apply to every map; follow the connections drawn on that board.',
  },
];
export const lessonResult = (lesson: Lesson) => applyMove(lesson.state, lesson.move);
