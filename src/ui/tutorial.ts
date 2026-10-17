import { lessons } from '../game/tutorial';
import { applyMove, legalMoves, type Move } from '../game/rules';
import { mapFor, nextSpot } from '../game/maps';
import { enableDragging } from './drag';

export const tutorialMarkup = `<dialog id="tutorial" aria-labelledby="lesson-title" aria-describedby="lesson-instruction">
  <div class="dialog-top"><p class="eyebrow">LEARN BY DOING</p><button class="quiet close" aria-label="Exit guided lesson">Exit ×</button></div>
  <div class="lesson-layout">
    <div class="lesson-copy"><p id="lesson-progress" class="eyebrow"></p><h2 id="lesson-title"></h2><p id="lesson-instruction"></p></div>
    <div class="lesson-arena"><div class="board" id="lesson-board" role="group" aria-label="Classic learning board. Blue delivers on the left."></div><p id="lesson-score"></p></div>
    <p id="lesson-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
    <div class="lesson-actions"><button class="quiet" id="lesson-back">Back</button><button class="quiet" id="lesson-retry">Reset</button><button class="primary" id="lesson-next" disabled>Next →</button></div>
  </div>
</dialog>`;

export function initTutorial(open: () => void) {
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  const dialog = get<HTMLDialogElement>('tutorial'),
    board = get('lesson-board');
  const map = mapFor();
  let index = 0,
    state = lessons[0].state,
    selected: number | null = null,
    passed = false;
  const complete = () => index === lessons.length;
  const message = (text: string) => {
    get('lesson-feedback').textContent = text;
  };
  function render() {
    const done = complete(),
      lesson = lessons[Math.min(index, lessons.length - 1)];
    get('lesson-progress').textContent = done
      ? 'LESSON COMPLETE'
      : `${index + 1} / ${lessons.length} · CLASSIC`;
    get('lesson-title').textContent = done ? 'You know the way across.' : lesson.title;
    get('lesson-instruction').textContent = done
      ? 'Start a Journey to unlock each map’s rivals, explore Free play, or try the Classic puzzles. You can replay this lesson from How to play.'
      : lesson.instruction;
    get('lesson-score').textContent =
      `Blue deliveries: ${state.delivered.blue} / 3${state.result && 'winner' in state.result ? ' · Blue wins!' : passed && state.turn === 'blue' ? ' · Coral passed. Blue moves again.' : ''}`;
    get<HTMLButtonElement>('lesson-back').disabled = index === 0;
    get('lesson-retry').hidden = done;
    get<HTMLButtonElement>('lesson-next').disabled = !passed && !done;
    get('lesson-next').textContent = done
      ? 'Back to play →'
      : index === lessons.length - 1
        ? 'Finish lesson →'
        : 'Next →';
    board.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach((button) => {
      const n = Number(button.dataset.lesson),
        owner = state.board[n];
      const dragging = ['drag-source', 'drop-target']
        .filter((c) => button.classList.contains(c))
        .join(' ');
      button.className = `node ${owner ?? 'empty'} ${selected === n ? 'selected' : ''} ${!passed && n === lesson.move.from ? 'lesson-source' : ''} ${!passed && n === lesson.move.to ? 'legal lesson-target' : ''} ${dragging}`;
      button.setAttribute(
        'aria-label',
        `${map.names[n]}: ${owner ? owner + ' pawn' : 'empty'}${!passed && n === lesson.move.to ? ', guided destination' : ''}`,
      );
      button.setAttribute('aria-pressed', String(n === selected));
      button.disabled = passed || done;
    });
  }
  function commit(move: Move) {
    if (passed || complete()) return;
    const expected = lessons[index].move;
    if (move.from !== expected.from || move.to !== expected.to) {
      message(
        'For this lesson, use the glowing Blue pawn and the outlined destination. Your move has not been used.',
      );
      return;
    }
    state = applyMove(state, move);
    selected = null;
    passed = true;
    render();
    message(lessons[index].feedback);
    get('lesson-next').focus();
  }
  const cancelDrag = enableDragging(board, {
    nodeAttribute: 'data-lesson',
    canStart: (n) => dialog.open && !passed && !complete() && state.board[n] === 'blue',
    moves: (n) => legalMoves(state).filter((m) => m.from === n),
    side: () => 'blue',
    select: (n) => {
      selected = n;
      render();
    },
    commit,
    announce: message,
  });
  function reset(step: number) {
    cancelDrag();
    index = step;
    selected = null;
    passed = false;
    state = lessons[Math.min(step, lessons.length - 1)].state;
    if (complete()) {
      state = applyMove(state, lessons.at(-1)!.move);
      try {
        localStorage.setItem('dama-tutorial-v1', JSON.stringify({ completed: true }));
      } catch {
        /* Learning works without storage. */
      }
      get('tutorial-start').textContent = 'Replay guided lesson →';
    }
    render();
    message(
      complete()
        ? 'Your saved match and Journey progress are unchanged.'
        : 'Try the highlighted move. These are teaching positions, separate from your match.',
    );
  }
  board.addEventListener('click', (event) => {
    if (passed || complete()) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-lesson]');
    if (!button) return;
    const n = Number(button.dataset.lesson);
    if (state.board[n] === 'blue') {
      selected = n;
      render();
      message('Now choose the outlined destination.');
    } else if (selected !== null) commit({ from: selected, to: n });
    else
      message(
        'Choose a Blue pawn first, or drag it straight to the outlined spot. Coral pawns and occupied spots cannot be entered.',
      );
  });
  board.addEventListener('keydown', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-lesson]');
    if (!button) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      board
        .querySelector<HTMLButtonElement>(
          `[data-lesson="${nextSpot('classic', Number(button.dataset.lesson), event.key)}"]`,
        )
        ?.focus();
    } else if (event.key === 'Escape' && selected !== null) {
      event.preventDefault();
      selected = null;
      render();
      message('Selection cleared.');
    }
  });
  get('lesson-next').addEventListener('click', () => {
    if (complete()) {
      dialog.close();
      return;
    }
    if (!passed) return;
    reset(index + 1);
    (complete()
      ? get('lesson-next')
      : board.querySelector<HTMLButtonElement>(`[data-lesson="${lessons[index].move.from}"]`)!
    ).focus();
  });
  get('lesson-back').addEventListener('click', () => {
    reset(Math.max(0, index - 1));
    get('lesson-title').focus();
  });
  get('lesson-retry').addEventListener('click', () => reset(index));
  dialog.addEventListener('close', () => {
    cancelDrag();
    board.innerHTML = '';
  });
  get('lesson-title').tabIndex = -1;
  get('tutorial-start').addEventListener('click', () => {
    if (document.querySelector('.traveller')) return;
    board.innerHTML = `<svg viewBox="0 0 500 500" preserveAspectRatio="none" aria-hidden="true">${map.edges.map(([a, b]) => `<line x1="${map.points[a][0]}" y1="${map.points[a][1]}" x2="${map.points[b][0]}" y2="${map.points[b][1]}"/>`).join('')}</svg>${map.points.map(([x, y], n) => `<button class="node" data-lesson="${n}" style="left:${x / 5}%;top:${y / 5}%"><span class="piece" aria-hidden="true"></span></button>`).join('')}`;
    reset(0);
    open();
    get('lesson-title').focus();
  });
  try {
    if (JSON.parse(localStorage.getItem('dama-tutorial-v1') ?? 'null')?.completed)
      get('tutorial-start').textContent = 'Replay guided lesson →';
  } catch {
    /* Optional completion marker. */
  }
}
