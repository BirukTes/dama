import './lab.css';
import { labMaps, type LabMapId } from './game/experiment-maps';
import {
  newExperiment,
  experimentMoves,
  experimentMove,
  experimentAI,
  isRetreat,
  type Experiment,
} from './game/experiment';
import type { Side } from './game/rules';

const root = document.querySelector<HTMLElement>('#lab')!;
root.innerHTML = `<header><a href="/">← Normal DA’MA</a><span>LOCAL EXPERIMENT</span></header><h1>Board & movement lab</h1><p class="intro" id="map-description"></p>
<section class="settings" aria-label="Experimental settings"><label>Board <select id="lab-map">${Object.entries(
  labMaps,
)
  .map(([id, map]) => `<option value="${id}">${map.name}</option>`)
  .join(
    '',
  )}</select></label><label><input id="routes" type="checkbox" checked> Extra routes</label><label><input id="restriction" type="checkbox" checked> One retreat each</label><label>Play <select id="player"><option value="blue">as Blue</option><option value="coral">as Coral</option><option value="local">both sides</option></select></label><label>First move <select id="starter"><option value="blue">Blue</option><option value="coral">Coral</option></select></label><button id="restart">Start / reset</button></section>
<p class="note">Settings apply when you reset. This page uses no saves and awards no Journey progress. It is served only by the local development server.</p>
<section class="scores" aria-label="Scores and retreats"><div id="blue"></div><div id="coral"></div></section><p id="status" role="status" aria-live="polite"></p><div id="board" role="group" aria-label="Experimental board"></div><p id="feedback" role="status" aria-live="polite">Tap a pawn, then a highlighted destination.</p><button id="undo">Undo turn</button>
<details><summary>What changes?</summary><p>Gold lines mark the extra connections: outer bypasses on Diamond, alternating diagonals on Weave, and junction approaches on Switchyard. Turn off Extra routes to compare each board's basic lanes. Only dots are stops: crossing lines do not create junctions.</p><p>Blue scores on the left; Coral scores on the right. A backward move goes away from your scoring edge and spends your one retreat. Vertical moves are unrestricted. Delivery, automatic passes and draw limits otherwise follow Classic.</p><p>The experimental computer uses a bounded four-ply search with these same rules. It is separate from the normal rivals and is not proof of optimal play. Try both starting sides and compare draw frequency.</p></details>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let state = newExperiment(),
  selected: number | null = null,
  stack: Experiment[] = [],
  player: Side | 'local' = 'blue',
  timer: ReturnType<typeof setTimeout> | undefined;
const computerTurn = () => player !== 'local' && state.turn !== player && !state.result;
function render() {
  const map = labMaps[state.labMap],
    points = map.points;
  $('map-description').textContent =
    `${map.name} · ${map.description} ${state.extraRoutes ? 'Extra routes on.' : 'Basic lanes only.'} ${state.restricted ? 'One retreat per side.' : 'Unrestricted movement.'}`;
  $('board').style.aspectRatio = String(map.aspect);
  $('board').setAttribute('aria-label', `Experimental ${map.name} board`);
  const result = state.result;
  $('status').textContent = result
    ? 'winner' in result
      ? `${result.winner === 'blue' ? 'Blue' : 'Coral'} wins!`
      : `Draw: ${result.draw}.`
    : `${state.turn === 'blue' ? 'Blue' : 'Coral'} to move${computerTurn() ? ' · Computer thinking…' : ''} · ${state.turns} turns`;
  for (const side of ['blue', 'coral'] as const)
    $('' + side).textContent =
      `${side === 'blue' ? 'Blue' : 'Coral'}: ${state.delivered[side]} / 3 delivered · ${state.restricted ? `${state.retreats[side]} retreat left` : 'Retreats unlimited'}`;
  const moves = selected === null ? [] : experimentMoves(state).filter((m) => m.from === selected);
  const line = ([a, b]: number[], extra = false) =>
    `<line class="${extra ? 'extra' : ''}" x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}"/>`;
  $('board').innerHTML =
    `<svg viewBox="0 0 500 500" preserveAspectRatio="none" aria-hidden="true">${map.edges.map((e) => line(e)).join('')}${state.extraRoutes ? map.extras.map((e) => line(e, true)).join('') : ''}</svg>${state.board.map((p, n) => `<button class="spot ${p ?? ''} ${selected === n ? 'selected' : ''} ${moves.some((m) => m.to === n) ? 'legal' : ''}" data-spot="${n}" style="left:${points[n][0] / 5}%;top:${points[n][1] / 5}%" aria-label="${map.names[n]}: ${p ?? 'empty'}${moves.some((m) => m.to === n) ? ', legal destination' : ''}" aria-pressed="${selected === n}"></button>`).join('')}`;
  $<HTMLButtonElement>('undo').disabled = !stack.length;
}
function schedule() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (computerTurn())
    timer = setTimeout(() => {
      const move = experimentAI(state);
      if (move) perform(move.from, move.to);
    }, 350);
}
function perform(from: number, to: number) {
  const previous = state;
  stack.push(previous);
  state = experimentMove(state, { from, to });
  selected = null;
  const delivered = state.delivered[previous.turn] > previous.delivered[previous.turn];
  $('feedback').textContent =
    `${previous.turn === 'blue' ? 'Blue' : 'Coral'} ${delivered ? 'delivered a pawn' : 'moved'}${previous.restricted && isRetreat(previous.turn, { from, to }, previous.labMap) ? ' and spent their retreat' : ''}.${state.turn === previous.turn && !state.result ? ' Opponent has no legal move and passes.' : ''}`;
  render();
  schedule();
}
$('board').addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLButtonElement>('[data-spot]');
  if (!target || computerTurn() || state.result) return;
  const n = Number(target.dataset.spot);
  if (selected !== null && experimentMoves(state).some((m) => m.from === selected && m.to === n)) {
    perform(selected, n);
    return;
  }
  if (state.board[n] === state.turn) {
    selected = selected === n ? null : n;
    $('feedback').textContent = experimentMoves(state).some((m) => m.from === n)
      ? 'Choose a highlighted destination.'
      : 'That pawn has no legal move. Try another pawn.';
    render();
    $('board').querySelector<HTMLButtonElement>(`[data-spot="${n}"]`)?.focus();
  } else $('feedback').textContent = 'Choose your pawn, then a highlighted empty destination.';
});
$('restart').addEventListener('click', () => {
  if (timer) clearTimeout(timer);
  player = $<HTMLSelectElement>('player').value as typeof player;
  state = newExperiment(
    $<HTMLInputElement>('routes').checked,
    $<HTMLInputElement>('restriction').checked,
    $<HTMLSelectElement>('starter').value as Side,
    $<HTMLSelectElement>('lab-map').value as LabMapId,
  );
  stack = [];
  selected = null;
  $('feedback').textContent = 'Tap a pawn, then a highlighted destination.';
  render();
  schedule();
});
$('undo').addEventListener('click', () => {
  if (timer) clearTimeout(timer);
  do {
    const previous = stack.pop();
    if (!previous) break;
    state = previous;
  } while (player !== 'local' && state.turn !== player && stack.length);
  selected = null;
  $('feedback').textContent = 'Turn undone, including its retreat allowance.';
  render();
  schedule();
});
render();
