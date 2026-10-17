import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { initialState, legalMoves, applyMove, other, type Move, type Side } from './game/rules';
import { loadSession, saveSession, type Session } from './persistence/save';
import { template, points, boardLines } from './ui/template';
import { mapFor, isMapId, type MapId } from './game/maps';
import { opponents, opponentFor, isOpponent, type OpponentId } from './game/opponents';
import { loadProgress, saveProgress, recordResult, unlocked } from './persistence/progress';
import { enableDragging } from './ui/drag';
import { createMatchId } from './persistence/match-id';
import { puzzles, puzzleFor, puzzleState, puzzleOutcome } from './game/puzzles';
import { puzzleSolver, choosePuzzleReply } from './game/puzzle-solver';
import { loadPuzzleProgress, recordPuzzle, savePuzzleProgress } from './persistence/puzzles';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
const names: Record<Side, string> = { blue: 'Blue', coral: 'Coral' };
const nodeNames = [
  'top left',
  'top middle',
  'top right',
  'middle left',
  'centre',
  'middle right',
  'bottom left',
  'bottom middle',
  'bottom right',
];
let mainSession = loadSession();
let savedPuzzle = loadSession('dama-puzzle-session-v1');
const restored = (() => {
  try {
    if (
      sessionStorage.getItem('dama-screen') === 'play' &&
      sessionStorage.getItem('dama-active-puzzle') === 'true'
    )
      return savedPuzzle ?? mainSession;
  } catch {
    /* Browser navigation can remain in memory. */
  }
  return mainSession;
})();
let session: Session = restored ?? {
  state: initialState(),
  mode: 'solo',
  difficulty: 'standard',
  undo: [],
  starter: 'blue',
};
session.opponent ??= 'coral';
session.matchId ??= createMatchId();
let progress = loadProgress();
let puzzleProgress = loadPuzzleProgress();
let chosenOpponent: OpponentId = session.opponent;
let renderedMap: MapId | null = null;
let pendingStart: Session['mode'] | false = false;
let rotationDismissed = false;
let ownsFullscreen = false;
let ownsOrientation = false;
let focusRequest = 0;
let selected: number | null = null;
let worker: Worker | null = null;
let thinking = false,
  animating = false,
  storageAvailable = true;
let timer: ReturnType<typeof setTimeout> | null = null;
let sound = true;
let soundPreferenceSet = false;
let audio: AudioContext | null = null;
let lastMove: Move | null = null;
let passedSide: Side | null = null;
let passUntil = 0;
let resultDismissed = false;
let returnToPause = false;
let hasGame = !!restored;
let screen: 'home' | 'play' = 'home';
let deliveryNotice = '';
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDelivery: Side | null = null;
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
try {
  if (restored && sessionStorage.getItem('dama-screen') === 'play') screen = 'play';
} catch {
  /* Navigation can remain in memory. */
}
$('#app').innerHTML = template;

$<HTMLSelectElement>('#difficulty-select').value = session.difficulty;
$<HTMLSelectElement>('#map-select').value = session.state.map ?? 'classic';
try {
  const choice = JSON.parse(localStorage.getItem('dama-home-choice-v1') ?? '{}');
  if (isOpponent(choice.opponent)) chosenOpponent = choice.opponent;
  if (isMapId(choice.map)) $<HTMLSelectElement>('#map-select').value = choice.map;
  if (['gentle', 'standard'].includes(choice.difficulty))
    $<HTMLSelectElement>('#difficulty-select').value = choice.difficulty;
} catch {
  /* Choosing a match does not require storage. */
}
try {
  const settings = JSON.parse(localStorage.getItem('dama-settings-v1') ?? '{}');
  soundPreferenceSet = settings.soundPreferenceSet === true;
  for (const setting of ['contrast', 'motion', 'sound', 'immersive'])
    $<HTMLInputElement>(`#${setting}`).checked =
      setting === 'sound'
        ? !soundPreferenceSet || settings.sound !== false
        : settings[setting] === true;
  if (['light', 'dark', 'system'].includes(settings.theme))
    $<HTMLSelectElement>('#theme').value = settings.theme;
} catch {
  /* Browser storage is optional. */
}
function updateSettings() {
  cancelDrag?.();
  document.body.classList.toggle('high-contrast', $<HTMLInputElement>('#contrast').checked);
  document.body.classList.toggle('reduce-motion', $<HTMLInputElement>('#motion').checked);
  sound = $<HTMLInputElement>('#sound').checked;
  const theme = $<HTMLSelectElement>('#theme').value;
  document.body.dataset.theme =
    theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : theme;
  document.body.classList.toggle('immersive', $<HTMLInputElement>('#immersive').checked);
  $('#rotation-hint').hidden = !$<HTMLInputElement>('#immersive').checked || rotationDismissed;
  if (!$<HTMLInputElement>('#immersive').checked) releaseFocus();
  $<HTMLInputElement>('#view-focus').checked = $<HTMLInputElement>('#immersive').checked;
  $<HTMLInputElement>('#view-standard').checked = !$<HTMLInputElement>('#immersive').checked;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', document.body.dataset.theme === 'dark' ? '#101c19' : '#f4f1e9');
  try {
    localStorage.setItem(
      'dama-settings-v1',
      JSON.stringify({
        ...Object.fromEntries(
          ['contrast', 'motion', 'sound', 'immersive'].map((k) => [
            k,
            $<HTMLInputElement>(`#${k}`).checked,
          ]),
        ),
        theme,
        soundPreferenceSet,
      }),
    );
  } catch {
    /* Play remains available. */
  }
}
// Initial settings are applied after drag cancellation has been registered below.
for (const setting of ['contrast', 'motion', 'immersive', 'theme'])
  $(`#${setting}`).addEventListener('change', updateSettings);
$('#sound').addEventListener('change', () => {
  soundPreferenceSet = true;
  updateSettings();
  if (sound) primeAudio();
});
$('#immersive').addEventListener('change', () => {
  if ($<HTMLInputElement>('#immersive').checked && screen === 'play') void enterFocus();
});
systemTheme.addEventListener('change', updateSettings);
$('#view-control').addEventListener('change', () => {
  if (animating) {
    updateSettings();
    return;
  }
  const toggle = $<HTMLInputElement>('#immersive');
  toggle.checked = $<HTMLInputElement>('#view-focus').checked;
  updateSettings();
  if (toggle.checked) void enterFocus();
  announce(
    toggle.checked
      ? 'Focus view enabled. Scores and turn status remain visible.'
      : 'Standard view enabled.',
  );
});
async function enterFocus() {
  const request = ++focusRequest;
  if (screen !== 'play' || !$<HTMLInputElement>('#immersive').checked) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      ownsFullscreen = true;
    }
    if (
      request !== focusRequest ||
      screen !== 'play' ||
      !$<HTMLInputElement>('#immersive').checked
    ) {
      releaseFocus();
      return;
    }
    const orientation = window.screen.orientation as ScreenOrientation & {
      lock?: (value: string) => Promise<void>;
    };
    if (matchMedia('(pointer: coarse)').matches && orientation.lock) {
      await orientation.lock('landscape');
      ownsOrientation = true;
      if (
        request !== focusRequest ||
        screen !== 'play' ||
        !$<HTMLInputElement>('#immersive').checked
      )
        releaseFocus();
    }
  } catch {
    /* The responsive board remains playable when fullscreen or locking is unavailable. */
  }
}
function releaseFocus() {
  focusRequest++;
  if (ownsOrientation) {
    window.screen.orientation?.unlock();
    ownsOrientation = false;
  }
  if (ownsFullscreen) {
    ownsFullscreen = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    ownsFullscreen = false;
    if (ownsOrientation) {
      window.screen.orientation?.unlock();
      ownsOrientation = false;
    }
  }
});
$('#dismiss-rotation').addEventListener('click', () => {
  rotationDismissed = true;
  $('#rotation-hint').hidden = true;
});
function announce(text: string) {
  $('#announcement').textContent = text;
}
function persist() {
  if (session.puzzleId) savedPuzzle = session;
  else mainSession = session;
  storageAvailable = saveSession(session);
}
function activePuzzle() {
  return puzzleFor(session.puzzleId);
}
function finished() {
  const p = activePuzzle();
  return !!session.state.result || !!(p && puzzleOutcome(session.state, p, session.undo.length));
}
function restorePassNotice() {
  const { history, result, turn } = session.state;
  const before = history.at(-2),
    after = history.at(-1);
  passedSide =
    !result &&
    before &&
    after &&
    before.slice(0, before.lastIndexOf(':')) === after.slice(0, after.lastIndexOf(':'))
      ? other(turn)
      : null;
  passUntil = passedSide ? performance.now() + 1800 : 0;
}
function render() {
  const s = session.state;
  const map = mapFor(s.map);
  const practice = map.id === 'crossroads';
  if (renderedMap !== map.id) {
    $('#board svg').innerHTML = boardLines(map.id);
    renderedMap = map.id;
  }
  $('#board-map-label').textContent = `${map.name}${practice ? ' · Practice' : ''}`;
  $('#board').setAttribute(
    'aria-label',
    `${map.name} board. ${map.description} Drag a pawn, or tap it then a connected empty spot.`,
  );
  const helpMap =
    screen === 'play' ? map : mapFor($<HTMLSelectElement>('#map-select').value as MapId);
  $('#help-map-note').textContent =
    `${helpMap.name}: ${helpMap.description} Three pawns, one connection per turn, first to deliver three wins.`;
  const puzzle = activePuzzle();
  const outcome = puzzle && puzzleOutcome(s, puzzle, session.undo.length);
  const ended = finished();
  if (puzzle && outcome === 'solved') {
    const previous = puzzleProgress[puzzle.id];
    if (
      !previous ||
      session.undo.length < previous.bestMoves ||
      (!session.puzzleHinted && !previous.unassisted)
    ) {
      puzzleProgress = recordPuzzle(
        puzzleProgress,
        puzzle.id,
        session.undo.length,
        !!session.puzzleHinted,
      );
      if (!savePuzzleProgress(puzzleProgress)) storageAvailable = false;
    }
  }
  const opponent = opponentFor(session.opponent);
  names.coral = session.mode === 'solo' ? opponent.name : 'Coral';
  document.body.dataset.opponent =
    session.mode === 'solo' && screen === 'play' ? opponent.id : 'coral';
  const updated = recordResult(progress, session);
  if (updated !== progress) {
    progress = updated;
    if (!saveProgress(progress)) storageAvailable = false;
  }
  const humanTurn = session.mode === 'local' || s.turn === 'blue';
  $('#home-screen').hidden = screen !== 'home';
  $('#play-screen').hidden = screen !== 'play';
  document.body.classList.toggle('playing', screen === 'play');
  document.body.classList.toggle('puzzling', screen === 'play' && !!puzzle);
  $('#continue-button').hidden = !hasGame;
  $('#continue-label').textContent = ended
    ? 'Review last match'
    : practice
      ? 'Continue Crossroads'
      : 'Continue match';
  if (screen === 'home') renderOpponents();
  $('#home-button').setAttribute(
    'aria-label',
    screen === 'play' ? 'Save match and return home' : 'DA’MA home',
  );
  $<HTMLButtonElement>('#play-again').disabled = animating;
  const moves = legalMoves(s).filter((m) => m.from === selected);
  $('#mode-label').textContent = puzzle
    ? `PUZZLE ${puzzles.indexOf(puzzle) + 1} · ${puzzle.title.toUpperCase()}`
    : session.mode === 'solo'
      ? `${map.name.toUpperCase()} · ${practice ? 'PRACTICE' : session.difficulty.toUpperCase()}`
      : `${map.name.toUpperCase()} · TWO PLAYERS`;
  $('#coral-label').textContent =
    session.mode === 'solo' ? `${opponent.symbol} ${opponent.name.toUpperCase()}` : 'CORAL';
  $('#blue-label').textContent = session.mode === 'solo' ? 'YOU · BLUE' : 'BLUE';
  for (const side of ['blue', 'coral'] as const) {
    const count = s.delivered[side] - Number(pendingDelivery === side);
    $(`#${side}-score`).innerHTML = Array.from(
      { length: 3 },
      (_, i) => `<span class="pip ${i < count ? 'filled' : ''}" aria-hidden="true"></span>`,
    ).join('');
    $(`#${side}-score`).setAttribute('aria-label', `${names[side]}: ${count} of 3 delivered`);
    $(`#${side}-count`).textContent = `${count} / 3`;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((button) => {
    const n = Number(button.dataset.node),
      owner = s.board[n];
    const gestureClasses = ['drag-source', 'drop-target']
      .filter((name) => button.classList.contains(name))
      .join(' ');
    button.className = `node ${owner ?? 'empty'} ${selected === n ? 'selected' : ''} ${moves.some((m) => m.to === n) ? 'legal' : ''} ${lastMove?.to === n ? 'last' : ''} ${gestureClasses}`;
    button.setAttribute(
      'aria-label',
      `${nodeNames[n]}: ${owner ? names[owner] + ' pawn' : 'empty'}${moves.some((m) => m.to === n) ? ', legal destination' : ''}`,
    );
    button.setAttribute('aria-pressed', String(selected === n));
    button.setAttribute('aria-disabled', String(ended || !humanTurn || thinking || animating));
  });
  $('#turn-dot').className = `turn-dot ${s.turn}`;
  let status = `${names[s.turn]} to move`;
  let instruction =
    selected === null
      ? 'Drag a pawn, or tap one to see its possible moves.'
      : 'Choose a highlighted spot. Select the pawn again to cancel.';
  if (thinking) {
    status = `${names.coral} is thinking`;
    instruction = opponent.tip;
  }
  const passNotice = $('#pass-notice');
  passNotice.hidden = screen !== 'play' || passedSide === null || !!s.result;
  passNotice.textContent = passedSide
    ? `${names[passedSide]} has no legal moves. Turn passed to ${names[other(passedSide)]}, who moves again.`
    : '';
  $('#delivery-notice').hidden = screen !== 'play' || !deliveryNotice || !!passedSide;
  $('#delivery-notice').textContent = deliveryNotice;
  if (passedSide && performance.now() < passUntil) {
    status = `${names[passedSide]}’s turn passed`;
    instruction = `No legal moves. ${names[other(passedSide)]} moves again.`;
  }
  const resultPanel = $<HTMLDialogElement>('#result-panel');
  if (!ended && resultPanel.open) resultPanel.close();
  $('.game').classList.toggle('finished', ended);
  $('#new-button').innerHTML = puzzle
    ? 'Retry puzzle ↻'
    : s.result
      ? 'Play again <span aria-hidden="true">↻</span>'
      : 'New match <span aria-hidden="true">↻</span>';
  if (s.result) {
    const winner = 'winner' in s.result ? s.result.winner : null;
    status = winner
      ? session.mode === 'solo'
        ? winner === 'blue'
          ? 'You won!'
          : `${opponent.name} won`
        : `${names[winner]} wins!`
      : 'Match drawn';
    instruction =
      'winner' in s.result
        ? 'All three pawns are home. Ready for another?'
        : {
            repetition: 'This position appeared three times.',
            blocked: 'Neither side can move.',
            'turn-limit': 'This match reached the 100-turn limit.',
          }[s.result.draw];
    $('#result-title').textContent = status;
    $('#result-detail').textContent = winner
      ? `${session.mode === 'solo' ? (winner === 'blue' ? 'You delivered' : `${opponent.name} delivered`) : `${names[winner]} delivered`} all three pawns. This match is finished.`
      : `${instruction} This match is finished.`;
    $('#final-score').textContent =
      `${session.mode === 'solo' ? 'You' : 'Blue'} ${s.delivered.blue} / 3 · ${names.coral} ${s.delivered.coral} / 3`;
    const next = opponents[opponents.findIndex((o) => o.id === opponent.id) + 1];
    const won = session.mode === 'solo' && winner === 'blue';
    $('#next-opponent').hidden = !won || !next || practice;
    $('#next-opponent').textContent = next ? `Meet ${next.name} →` : 'Next challenge →';
    $('#journey-result').hidden = session.mode !== 'solo';
    $('#journey-result').textContent = won
      ? next
        ? `You beat ${opponent.name}! ${next.name} is ready: ${next.description}`
        : 'You beat all three rivals! Replay a favourite or try the Standard setting.'
      : winner
        ? `${opponent.name} won this round. ${opponent.tip}`
        : `Try a different route next time. ${opponent.tip}`;
    if (practice)
      $('#journey-result').textContent =
        'Crossroads practice. Your Classic rival records and unlocks are unchanged. Try a different route or rematch.';
  }
  $('#next-puzzle').hidden =
    !puzzle || outcome !== 'solved' || puzzles.indexOf(puzzle) === puzzles.length - 1;
  $('#puzzle-hint').hidden = !puzzle || ended;
  $<HTMLButtonElement>('#puzzle-hint').disabled = thinking || animating;
  $('#play-again').textContent = puzzle ? 'Retry puzzle ↻' : 'Play again ↻';
  if (puzzle) {
    $('#next-opponent').hidden = true;
    $('#journey-result').hidden = !outcome;
    $('#journey-result').textContent = outcome ? puzzle.explanation : '';
    if (outcome) {
      status = outcome === 'solved' ? 'Puzzle solved!' : 'Try another route';
      instruction =
        outcome === 'solved'
          ? puzzle.explanation
          : 'The goal was not reached. Retry with a different plan.';
      $('#result-title').textContent = status;
      $('#result-detail').textContent =
        `${puzzle.title} · ${outcome === 'solved' ? 'Delivered all three' : 'Finish all deliveries'} within ${puzzle.moves} of your moves. ${session.puzzleHinted ? 'Hint used.' : 'No hint used.'}`;
      $('#final-score').textContent =
        `${session.undo.length} / ${puzzle.moves} moves · ${s.delivered.blue} / 3 delivered`;
    } else {
      const left = puzzle.moves - session.undo.length;
      status = thinking
        ? 'Coral is defending'
        : `${puzzle.title} · ${left} ${left === 1 ? 'move' : 'moves'} left`;
      instruction = `Deliver all remaining Blue pawns. Only your moves count.${session.puzzleHinted ? ' Hint used.' : ''}`;
    }
    $('#instruction').classList.toggle('puzzle-clue', !!session.puzzleHinted);
  }
  if (ended) {
    if (
      screen === 'play' &&
      !animating &&
      !resultDismissed &&
      !document.querySelector('dialog[open]')
    )
      resultPanel.showModal();
  }
  $('#status').textContent = status;
  $('#instruction').textContent = instruction;
  $('#undo-button').hidden = ended;
  $<HTMLButtonElement>('#play-again').disabled = animating;
  $<HTMLButtonElement>('#undo-button').disabled =
    ended || session.undo.length === 0 || thinking || animating;
  $('#move-count').textContent = `TURN ${s.turns + Number(!s.result)}`;
  $('#save-status').textContent = storageAvailable ? 'SAVED ON THIS DEVICE' : 'SAVING UNAVAILABLE';
}
function cancelComputer() {
  if (timer) clearTimeout(timer);
  timer = null;
  worker?.terminate();
  worker = null;
  thinking = false;
}
function scheduleComputer() {
  cancelComputer();
  if (
    screen !== 'play' ||
    session.mode !== 'solo' ||
    session.state.turn !== 'coral' ||
    finished() ||
    document.hidden ||
    document.querySelector('dialog[open]')
  )
    return;
  thinking = true;
  render();
  timer = setTimeout(
    () => {
      render();
      const current = new Worker(new URL('./ai/worker.ts', import.meta.url), { type: 'module' });
      worker = current;
      current.onmessage = (event: MessageEvent<Move | null>) => {
        if (worker !== current) return;
        cancelComputer();
        if (event.data) void commit(event.data, false);
        else render();
      };
      current.onerror = () => {
        cancelComputer();
        const puzzle = activePuzzle();
        const fallback = puzzle
          ? choosePuzzleReply(session.state, puzzle.moves - session.undo.length)
          : legalMoves(session.state)[0];
        if (fallback) void commit(fallback, false);
      };
      current.postMessage({
        state: session.state,
        difficulty: session.difficulty,
        opponent: session.opponent,
        puzzleMoves: activePuzzle() ? activePuzzle()!.moves - session.undo.length : undefined,
      });
    },
    Math.max(450, passUntil - performance.now()),
  );
}
function primeAudio() {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    /* Audio support never blocks play. */
  }
}
// Resume during the gesture, before move animations or computer replies lose activation.
document.addEventListener('pointerup', primeAudio, { capture: true, passive: true });
document.addEventListener('click', primeAudio, { capture: true, passive: true });
document.addEventListener('keydown', primeAudio, { capture: true, passive: true });
function playSound(delivered: boolean) {
  if (!sound) return;
  try {
    primeAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = delivered ? 660 : 330;
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.17);
  } catch {
    /* Sound never blocks a move. */
  }
}
function clearDelivery() {
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = null;
  deliveryNotice = '';
  pendingDelivery = null;
}
function showDelivery(side: Side) {
  if (noticeTimer) clearTimeout(noticeTimer);
  deliveryNotice = `${names[side]} pawn delivered · ${session.state.delivered[side]} of 3 home`;
  $('#delivery-notice').className = `delivery-notice ${side}`;
  announce(deliveryNotice);
  noticeTimer = setTimeout(() => {
    deliveryNotice = '';
    noticeTimer = null;
    render();
  }, 2000);
}
async function commit(move: Move, human: boolean, origin?: { x: number; y: number }) {
  if (
    animating ||
    finished() ||
    !legalMoves(session.state).some((m) => m.from === move.from && m.to === move.to)
  )
    return;
  const previous = session.state,
    side = previous.turn;
  clearDelivery();
  passedSide = null;
  passUntil = 0;
  if (human) session.undo.push(structuredClone(previous));
  session.state = applyMove(previous, move);
  lastMove = move;
  selected = null;
  const delivered = session.state.delivered[side] > previous.delivered[side];
  pendingDelivery = delivered ? side : null;
  animating = true;
  persist();
  render();
  const reduced =
    document.body.classList.contains('reduce-motion') ||
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    const dot = document.createElement('span');
    dot.className = `traveller ${side}`;
    const [x, y] = points[move.from],
      [tx, ty] = points[move.to];
    dot.style.left = `${x / 5}%`;
    dot.style.top = `${y / 5}%`;
    $('#board').append(dot);
    const destination = $(`[data-node="${move.to}"] .piece`);
    destination.style.visibility = 'hidden';
    const width = $('#board').clientWidth,
      height = $('#board').clientHeight;
    const rect = $('#board').getBoundingClientRect();
    const start = origin
      ? `translate(calc(-50% + ${origin.x - rect.left - (x / 500) * width}px), calc(-50% + ${origin.y - rect.top - (y / 500) * height}px))`
      : 'translate(-50%, -50%)';
    const atGoal = `translate(calc(-50% + ${((tx - x) / 500) * width}px), calc(-50% + ${((ty - y) / 500) * height}px))`;
    await dot.animate([{ transform: start }, { transform: atGoal }], {
      duration: origin ? 120 : 260,
      easing: 'ease-out',
      fill: 'forwards',
    }).finished;
    if (delivered) {
      pendingDelivery = null;
      showDelivery(side);
      render();
      const marker = $(`#${side}-score .pip:nth-child(${session.state.delivered[side]})`),
        target = marker.getBoundingClientRect(),
        boardRect = $('#board').getBoundingClientRect();
      const dx = target.left + target.width / 2 - boardRect.left - (x / 500) * width,
        dy = target.top + target.height / 2 - boardRect.top - (y / 500) * height;
      await dot.animate(
        [
          { transform: atGoal, offset: 0 },
          { transform: atGoal, offset: 0.2 },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.3)`,
            opacity: 0.25,
          },
        ],
        { duration: 440, easing: 'ease-in-out', fill: 'forwards' },
      ).finished;
      marker.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.7)' }, { transform: 'scale(1)' }],
        { duration: 280 },
      );
    }
    dot.remove();
    destination.style.visibility = '';
  }
  animating = false;
  if (delivered && reduced) {
    pendingDelivery = null;
    showDelivery(side);
  }
  if (!session.state.result && session.state.turns === previous.turns + 2) {
    passedSide = other(side);
    passUntil = performance.now() + 1800;
  }
  playSound(delivered);
  render();
  const ended = finished();
  announce(
    `${names[side]} ${delivered ? 'delivered a pawn' : `moved from ${nodeNames[move.from]} to ${nodeNames[move.to]}`}. ${ended ? $('#status').textContent : `${names[session.state.turn]} to move.${session.state.turn === side ? ' The other player had no legal move and passed.' : ''}`}`,
  );
  scheduleComputer();
}
const cancelDrag = enableDragging($('#board'), {
  canStart: (n) =>
    screen === 'play' &&
    !thinking &&
    !animating &&
    !finished() &&
    !document.querySelector('dialog[open]') &&
    (session.mode === 'local' || session.state.turn === 'blue') &&
    session.state.board[n] === session.state.turn,
  moves: (n) => legalMoves(session.state).filter((m) => m.from === n),
  side: () => session.state.turn,
  select: (n) => {
    selected = n;
    render();
  },
  commit: (move, origin) => {
    void commit(move, true, origin);
  },
  announce,
});
updateSettings();
$('#board').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-node]');
  if (
    !button ||
    thinking ||
    animating ||
    finished() ||
    (session.mode === 'solo' && session.state.turn !== 'blue')
  )
    return;
  const n = Number(button.dataset.node);
  if (session.state.board[n] === session.state.turn) {
    selected = selected === n ? null : n;
    render();
    return;
  }
  if (selected !== null && legalMoves(session.state).some((m) => m.from === selected && m.to === n))
    void commit({ from: selected, to: n }, true);
  else announce('Select one of your pawns, then a highlighted empty spot.');
});
$('#board').addEventListener('keydown', (event) => {
  const e = event as KeyboardEvent,
    button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-node]');
  if (!button) return;
  const n = Number(button.dataset.node),
    delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 };
  if (e.key === 'Escape') {
    selected = null;
    render();
  }
  if (e.key in delta) {
    e.preventDefault();
    $<HTMLButtonElement>(`[data-node="${(n + delta[e.key] + 9) % 9}"]`).focus();
  }
});
$('#undo-button').addEventListener('click', () => {
  if (animating || thinking || finished()) return;
  const previous = session.undo.pop();
  if (!previous) return;
  cancelComputer();
  clearDelivery();
  session.state = previous;
  selected = null;
  lastMove = null;
  restorePassNotice();
  persist();
  render();
  announce('Move undone.');
  scheduleComputer();
});
function openDialog(id: string) {
  if (animating) return;
  cancelDrag();
  cancelComputer();
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
  $<HTMLDialogElement>(id).showModal();
  render();
}
function setScreen(next: 'home' | 'play') {
  if (animating) return;
  cancelComputer();
  cancelDrag();
  if (next === 'home') releaseFocus();
  if (next === 'home' && session.puzzleId) {
    persist();
    session = mainSession ?? {
      state: initialState(),
      mode: 'solo',
      difficulty: 'standard',
      undo: [],
      starter: 'blue',
      opponent: 'coral',
      matchId: createMatchId(),
    };
    hasGame = !!mainSession;
    clearDelivery();
    selected = null;
    lastMove = null;
    restorePassNotice();
  }
  screen = next;
  returnToPause = false;
  try {
    sessionStorage.setItem('dama-screen', screen);
    sessionStorage.setItem('dama-active-puzzle', String(!!session.puzzleId));
  } catch {
    /* Navigation can remain in memory. */
  }
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
  if (hasGame) persist();
  render();
  scheduleComputer();
  if (!document.querySelector('dialog[open]'))
    $(screen === 'play' ? '#pause-button' : `[data-rival="${chosenOpponent}"]`).focus();
  window.scrollTo(0, 0);
}
function saveHomeChoice() {
  try {
    localStorage.setItem(
      'dama-home-choice-v1',
      JSON.stringify({
        opponent: chosenOpponent,
        map: $<HTMLSelectElement>('#map-select').value,
        difficulty: $<HTMLSelectElement>('#difficulty-select').value,
      }),
    );
  } catch {
    /* Selection remains available in memory. */
  }
}
function requestHomeMatch(mode: Session['mode']) {
  if (animating) return;
  if (hasGame && !session.state.result && session.state.turns > 0) {
    pendingStart = mode;
    $('#restart-detail').textContent =
      `Playing ${mode === 'solo' ? opponentFor(chosenOpponent).name : 'with a friend'} on ${mapFor($<HTMLSelectElement>('#map-select').value as MapId).name} will replace your unfinished match. Your rival progress is kept.`;
    $('#confirm-new').textContent = 'Replace match & play';
    openDialog('#restart');
  } else startNewMatch(mode);
}
function renderOpponents() {
  const map = mapFor($<HTMLSelectElement>('#map-select').value as MapId);
  const practice = map.id === 'crossroads';
  $<HTMLSelectElement>('#map-select').title = map.description;
  if (!practice && !unlocked(progress, chosenOpponent)) chosenOpponent = 'coral';
  const count = opponents.filter((o) => progress.wins[o.id] > 0).length;
  $('#journey-progress').textContent = practice
    ? 'Crossroads · Practice board · All rivals available. Classic progress is kept.'
    : `${count} / 3 rivals beaten · ${count === 3 ? 'Journey complete. Replay any rival.' : 'Win to meet the next rival.'} Progress saves on this browser.`;
  $('#opponent-cards').innerHTML = opponents
    .map((o, index) => {
      const available = practice || unlocked(progress, o.id),
        wins = progress.wins[o.id];
      return `<button class="opponent-card" data-rival="${o.id}" aria-pressed="${chosenOpponent === o.id}" ${available ? '' : 'disabled'}>
      <span class="opponent-symbol rival-${o.id}" aria-hidden="true">${o.symbol}</span><strong>${o.name}</strong><small>${o.level}</small>
      <span class="rival-progress">${practice ? 'Practice match' : wins ? `✓ ${wins} ${wins === 1 ? 'win' : 'wins'}` : available ? 'Ready to challenge' : `Beat ${opponents[index - 1].name} to unlock`}</span></button>`;
    })
    .join('');
  const o = opponentFor(chosenOpponent);
  $('#opponent-profile').innerHTML =
    `<p class="eyebrow">${o.symbol} ${o.name.toUpperCase()} · ${o.title.toUpperCase()}</p><p>${practice ? map.description : o.description}</p><small>${practice ? 'Practice · Classic records are kept separately.' : `${progress.wins[o.id]} wins · ${progress.losses[o.id]} losses · ${progress.draws[o.id]} draws`}</small>`;
  $('#start-button').textContent = `Play ${o.name} →`;
  $('#puzzles-button').textContent =
    `Puzzles · ${Object.keys(puzzleProgress).length} / ${puzzles.length}`;
}
$('#opponent-cards').addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-rival]');
  if (!card || card.disabled) return;
  chosenOpponent = card.dataset.rival as OpponentId;
  saveHomeChoice();
  renderOpponents();
  $<HTMLButtonElement>(`[data-rival="${chosenOpponent}"]`).focus();
});
$('#next-opponent').addEventListener('click', () => {
  const next = opponents[opponents.findIndex((o) => o.id === session.opponent) + 1];
  if (!next || !unlocked(progress, next.id)) return;
  chosenOpponent = next.id;
  saveHomeChoice();
  setScreen('home');
});
$('#difficulty-select').addEventListener('change', saveHomeChoice);
$('#map-select').addEventListener('change', () => {
  render();
  saveHomeChoice();
});
$('#local-button').addEventListener('click', () => requestHomeMatch('local'));
$('#start-button').addEventListener('click', () => requestHomeMatch('solo'));
$('#continue-button').addEventListener('click', () => {
  resultDismissed = false;
  setScreen('play');
  if ($<HTMLInputElement>('#immersive').checked) void enterFocus();
});
$('#home-button').addEventListener('click', () => setScreen('home'));
document
  .querySelectorAll('.go-home')
  .forEach((button) => button.addEventListener('click', () => setScreen('home')));
$('#pause-button').addEventListener('click', () => openDialog('#pause'));
$('#pause-settings').addEventListener('click', () => {
  returnToPause = true;
  openDialog('#settings');
});
$('#pause-help').addEventListener('click', () => {
  returnToPause = true;
  openDialog('#help');
});
$('#pause-new').addEventListener('click', requestNewMatch);
$('#help-button').addEventListener('click', () => openDialog('#help'));
$('#settings-button').addEventListener('click', () => openDialog('#settings'));
function requestNewMatch() {
  if (animating) return;
  if (session.puzzleId) {
    startPuzzle(session.puzzleId, true);
    return;
  }
  pendingStart = false;
  $('#restart-detail').textContent =
    'Start again with the same players and challenge setting. This replaces your unfinished match.';
  $('#confirm-new').textContent = 'Start new match';
  if (session.state.result || session.state.turns === 0) startNewMatch();
  else openDialog('#restart');
}
$('#new-button').addEventListener('click', requestNewMatch);
$('#play-again').addEventListener('click', () => {
  if (!animating) {
    if (session.puzzleId) startPuzzle(session.puzzleId, true);
    else startNewMatch();
  }
});
document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => {
  dialog
    .querySelectorAll('.close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    if (dialog.id === 'result-panel' && finished()) resultDismissed = true;
    if (returnToPause && screen === 'play' && (dialog.id === 'settings' || dialog.id === 'help')) {
      returnToPause = false;
      openDialog('#pause');
      return;
    }
    scheduleComputer();
  });
});
function startNewMatch(fresh: Session['mode'] | false = false) {
  cancelComputer();
  clearDelivery();
  const starter = fresh ? 'blue' : other(session.starter);
  session = {
    state: initialState(
      starter,
      fresh ? ($<HTMLSelectElement>('#map-select').value as MapId) : session.state.map,
    ),
    starter,
    mode: fresh || session.mode,
    difficulty: fresh
      ? ($<HTMLSelectElement>('#difficulty-select').value as Session['difficulty'])
      : session.difficulty,
    undo: [],
    opponent: fresh ? chosenOpponent : session.opponent,
    matchId: createMatchId(),
  };
  hasGame = true;
  selected = null;
  lastMove = null;
  passedSide = null;
  passUntil = 0;
  resultDismissed = false;
  persist();
  render();
  setScreen('play');
  if ($<HTMLInputElement>('#immersive').checked) void enterFocus();
  announce('New match started.');
}
$('#confirm-new').addEventListener('click', () => startNewMatch(pendingStart));
function renderPuzzles() {
  $('#puzzle-list').innerHTML = puzzles
    .map((p, index) => {
      const completed = puzzleProgress[p.id];
      const resume =
        savedPuzzle?.puzzleId === p.id &&
        !puzzleOutcome(savedPuzzle.state, p, savedPuzzle.undo.length);
      const preview = `<svg viewBox="0 0 100 100" aria-hidden="true">${p.board.map((side, n) => `<circle cx="${16 + (n % 3) * 34}" cy="${16 + Math.floor(n / 3) * 34}" r="${side ? 8 : 3}" class="preview-${side ?? 'empty'}"/>`).join('')}</svg>`;
      return `<button class="puzzle-card" data-puzzle="${p.id}">${preview}<span><strong>${index + 1}. ${p.title}</strong><small>${p.theme} · Win in ${p.moves} ${p.moves === 1 ? 'move' : 'moves'}</small><small>${completed ? `✓ Solved ${completed.unassisted ? 'without hints' : 'with a hint'} · best ${completed.bestMoves}` : resume ? 'Continue your saved attempt →' : 'Try this puzzle →'}</small></span></button>`;
    })
    .join('');
}
function startPuzzle(id: string, retry = false) {
  if (animating) return;
  const puzzle = puzzleFor(id);
  if (!puzzle) return;
  cancelComputer();
  cancelDrag();
  clearDelivery();
  if (!session.puzzleId) mainSession = hasGame ? session : null;
  const resume =
    !retry &&
    savedPuzzle?.puzzleId === id &&
    !puzzleOutcome(savedPuzzle.state, puzzle, savedPuzzle.undo.length);
  session = resume
    ? savedPuzzle!
    : {
        state: puzzleState(puzzle),
        mode: 'solo',
        difficulty: 'standard',
        starter: 'blue',
        undo: [],
        opponent: 'coral',
        matchId: createMatchId(),
        puzzleId: id,
        puzzleHinted: false,
      };
  hasGame = true;
  selected = null;
  lastMove = null;
  resultDismissed = false;
  restorePassNotice();
  persist();
  setScreen('play');
  if ($<HTMLInputElement>('#immersive').checked) void enterFocus();
  announce(`${puzzle.title}. Win within ${puzzle.moves} of your moves. Coral defends.`);
}
$('#puzzles-button').addEventListener('click', () => {
  renderPuzzles();
  openDialog('#puzzles-dialog');
});
$('#puzzle-list').addEventListener('click', (event) => {
  const card = (event.target as HTMLElement).closest<HTMLElement>('[data-puzzle]');
  if (card) startPuzzle(card.dataset.puzzle!);
});
$('#puzzle-hint').addEventListener('click', () => {
  const p = activePuzzle();
  if (!p || animating || thinking || finished()) return;
  session.puzzleHinted = true;
  const move = puzzleSolver().winningMoves(session.state, p.moves - session.undo.length)[0];
  const puzzleMessage = move
    ? `${p.hint} Try ${nodeNames[move.from]} → ${nodeNames[move.to]}.`
    : 'This route no longer guarantees the goal. Undo or retry to find another way.';
  $('#puzzle-hint-text').textContent = puzzleMessage;
  persist();
  openDialog('#puzzle-hint-dialog');
  announce(puzzleMessage);
});
$('#next-puzzle').addEventListener('click', () => {
  const p = activePuzzle();
  const next = p && puzzles[puzzles.indexOf(p) + 1];
  if (next) startPuzzle(next.id);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelComputer();
    if (hasGame) persist();
    render();
  } else scheduleComputer();
});
restorePassNotice();
if (hasGame) persist();
render();
if (restored)
  announce(
    finished()
      ? `Saved match: ${$('#status').textContent}. Game over. Play again to start a new match.`
      : 'Your saved match is ready to continue.',
  );
scheduleComputer();
