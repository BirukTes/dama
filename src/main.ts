import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import './style.css';
import { initialState, legalMoves, applyMove, other, type Move, type Side } from './game/rules';
import { loadSession, saveSession, type Session } from './persistence/save';
import { template, points } from './ui/template';

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
const restored = loadSession();
let session: Session = restored ?? {
  state: initialState(),
  mode: 'solo',
  difficulty: 'standard',
  undo: [],
  starter: 'blue',
};
let selected: number | null = null;
let worker: Worker | null = null;
let thinking = false,
  animating = false,
  storageAvailable = true;
let timer: ReturnType<typeof setTimeout> | null = null;
let sound = false;
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

$('#mode-select').setAttribute('value', session.mode);
$<HTMLSelectElement>('#mode-select').value = session.mode;
$<HTMLSelectElement>('#difficulty-select').value = session.difficulty;
try {
  const settings = JSON.parse(localStorage.getItem('dama-settings-v1') ?? '{}');
  for (const setting of ['contrast', 'motion', 'sound', 'immersive'])
    $<HTMLInputElement>(`#${setting}`).checked = settings[setting] === true;
  if (['light', 'dark', 'system'].includes(settings.theme))
    $<HTMLSelectElement>('#theme').value = settings.theme;
} catch {
  /* Browser storage is optional. */
}
function updateSettings() {
  document.body.classList.toggle('high-contrast', $<HTMLInputElement>('#contrast').checked);
  document.body.classList.toggle('reduce-motion', $<HTMLInputElement>('#motion').checked);
  sound = $<HTMLInputElement>('#sound').checked;
  const theme = $<HTMLSelectElement>('#theme').value;
  document.body.dataset.theme =
    theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : theme;
  document.body.classList.toggle('immersive', $<HTMLInputElement>('#immersive').checked);
  $('#view-button').textContent = $<HTMLInputElement>('#immersive').checked
    ? 'Standard view'
    : 'Focus view';
  $('#view-button').setAttribute('aria-pressed', String($<HTMLInputElement>('#immersive').checked));
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
      }),
    );
  } catch {
    /* Play remains available. */
  }
}
updateSettings();
for (const setting of ['contrast', 'motion', 'sound', 'immersive', 'theme'])
  $(`#${setting}`).addEventListener('change', updateSettings);
systemTheme.addEventListener('change', updateSettings);
$('#view-button').addEventListener('click', () => {
  if (animating) return;
  const toggle = $<HTMLInputElement>('#immersive');
  toggle.checked = !toggle.checked;
  updateSettings();
  announce(
    toggle.checked
      ? 'Focus view enabled. Scores and turn status remain visible.'
      : 'Standard view enabled.',
  );
});
function announce(text: string) {
  $('#announcement').textContent = text;
}
function persist() {
  storageAvailable = saveSession(session);
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
  const humanTurn = session.mode === 'local' || s.turn === 'blue';
  $('#home-screen').hidden = screen !== 'home';
  $('#play-screen').hidden = screen !== 'play';
  document.body.classList.toggle('playing', screen === 'play');
  $('#continue-button').hidden = !hasGame;
  $('#continue-label').textContent = s.result ? 'Review last match' : 'Continue match';
  $('#home-button').setAttribute(
    'aria-label',
    screen === 'play' ? 'Save match and return home' : 'DA’MA home',
  );
  $<HTMLButtonElement>('#play-again').disabled = animating;
  const moves = legalMoves(s).filter((m) => m.from === selected);
  $('#mode-label').textContent =
    session.mode === 'solo'
      ? `YOU + COMPUTER · ${session.difficulty.toUpperCase()}`
      : 'TWO PLAYERS · ONE BOARD';
  $('#coral-label').textContent = session.mode === 'solo' ? 'COMPUTER · CORAL' : 'CORAL';
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
    button.className = `node ${owner ?? 'empty'} ${selected === n ? 'selected' : ''} ${moves.some((m) => m.to === n) ? 'legal' : ''} ${lastMove?.to === n ? 'last' : ''}`;
    button.setAttribute(
      'aria-label',
      `${nodeNames[n]}: ${owner ? names[owner] + ' pawn' : 'empty'}${moves.some((m) => m.to === n) ? ', legal destination' : ''}`,
    );
    button.setAttribute('aria-pressed', String(selected === n));
    button.setAttribute('aria-disabled', String(!!s.result || !humanTurn || thinking || animating));
  });
  $('#turn-dot').className = `turn-dot ${s.turn}`;
  let status = `${names[s.turn]} to move`;
  let instruction =
    selected === null
      ? 'Choose a pawn to see its possible moves.'
      : 'Choose a highlighted spot. Select the pawn again to cancel.';
  if (thinking) {
    status = 'Coral is thinking';
    instruction = 'Finding a way across…';
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
  if (!s.result && resultPanel.open) resultPanel.close();
  $('.game').classList.toggle('finished', !!s.result);
  $('#new-button').innerHTML = s.result
    ? 'Play again <span aria-hidden="true">↻</span>'
    : 'New match <span aria-hidden="true">↻</span>';
  if (s.result) {
    const winner = 'winner' in s.result ? s.result.winner : null;
    status = winner
      ? session.mode === 'solo'
        ? winner === 'blue'
          ? 'You won!'
          : 'The computer won'
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
      ? `${session.mode === 'solo' ? (winner === 'blue' ? 'You delivered' : 'The computer delivered') : `${names[winner]} delivered`} all three pawns. This match is finished.`
      : `${instruction} This match is finished.`;
    $('#final-score').textContent =
      `${session.mode === 'solo' ? 'You' : 'Blue'} ${s.delivered.blue} / 3 · ${session.mode === 'solo' ? 'Computer' : 'Coral'} ${s.delivered.coral} / 3`;
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
  $('#undo-button').hidden = !!s.result;
  $<HTMLButtonElement>('#play-again').disabled = animating;
  $<HTMLButtonElement>('#undo-button').disabled =
    !!s.result || session.undo.length === 0 || thinking || animating;
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
    session.state.result ||
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
        const fallback = legalMoves(session.state)[0];
        if (fallback) void commit(fallback, false);
      };
      current.postMessage({ state: session.state, difficulty: session.difficulty });
    },
    Math.max(450, passUntil - performance.now()),
  );
}
function playSound(delivered: boolean) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
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
async function commit(move: Move, human: boolean) {
  if (animating || !legalMoves(session.state).some((m) => m.from === move.from && m.to === move.to))
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
    const size = $('#board').clientWidth;
    const atGoal = `translate(calc(-50% + ${((tx - x) / 500) * size}px), calc(-50% + ${((ty - y) / 500) * size}px))`;
    await dot.animate([{ transform: 'translate(-50%, -50%)' }, { transform: atGoal }], {
      duration: 260,
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
      const dx = target.left + target.width / 2 - boardRect.left - (x / 500) * size,
        dy = target.top + target.height / 2 - boardRect.top - (y / 500) * size;
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
  const result = session.state.result;
  announce(
    `${names[side]} ${delivered ? 'delivered a pawn' : `moved from ${nodeNames[move.from]} to ${nodeNames[move.to]}`}. ${result ? $('#status').textContent : `${names[session.state.turn]} to move.${session.state.turn === side ? ' The other player had no legal move and passed.' : ''}`}`,
  );
  scheduleComputer();
}
$('#board').addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-node]');
  if (
    !button ||
    thinking ||
    animating ||
    session.state.result ||
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
  if (animating || thinking || session.state.result) return;
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
  cancelComputer();
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
  $<HTMLDialogElement>(id).showModal();
  render();
}
function setScreen(next: 'home' | 'play') {
  if (animating) return;
  cancelComputer();
  screen = next;
  returnToPause = false;
  try {
    sessionStorage.setItem('dama-screen', screen);
  } catch {
    /* Navigation can remain in memory. */
  }
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach((d) => d.close());
  if (hasGame) persist();
  render();
  scheduleComputer();
  if (!document.querySelector('dialog[open]'))
    $(screen === 'play' ? '#pause-button' : '#solo-button').focus();
  window.scrollTo(0, 0);
}
function setup(mode: Session['mode']) {
  $<HTMLSelectElement>('#mode-select').value = mode;
  $('#difficulty-field').hidden = mode === 'local';
  $('#setup-note').textContent =
    `Blue moves first. ${mode === 'solo' ? 'You play as Blue.' : 'Pass the device between turns.'}${hasGame && !session.state.result && session.state.turns > 0 ? ' Starting this match replaces your saved unfinished match.' : ''}`;
  openDialog('#setup');
}
$('#mode-select').addEventListener('change', () =>
  setup($<HTMLSelectElement>('#mode-select').value as Session['mode']),
);
$('#solo-button').addEventListener('click', () => setup('solo'));
$('#local-button').addEventListener('click', () => setup('local'));
$('#start-button').addEventListener('click', () => startNewMatch(true));
$('#continue-button').addEventListener('click', () => {
  resultDismissed = false;
  setScreen('play');
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
$('#learn-button').addEventListener('click', () => openDialog('#help'));
$('#help-button').addEventListener('click', () => openDialog('#help'));
$('#settings-button').addEventListener('click', () => openDialog('#settings'));
function requestNewMatch() {
  if (animating) return;
  if (session.state.result || session.state.turns === 0) startNewMatch();
  else openDialog('#restart');
}
$('#new-button').addEventListener('click', requestNewMatch);
$('#play-again').addEventListener('click', () => {
  if (!animating) startNewMatch();
});
document.querySelectorAll<HTMLDialogElement>('dialog').forEach((dialog) => {
  dialog
    .querySelectorAll('.close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    if (dialog.id === 'result-panel' && session.state.result) resultDismissed = true;
    if (returnToPause && screen === 'play' && (dialog.id === 'settings' || dialog.id === 'help')) {
      returnToPause = false;
      openDialog('#pause');
      return;
    }
    scheduleComputer();
  });
});
function startNewMatch(fresh = false) {
  cancelComputer();
  clearDelivery();
  const starter = fresh ? 'blue' : other(session.starter);
  session = {
    state: initialState(starter),
    starter,
    mode: fresh ? ($<HTMLSelectElement>('#mode-select').value as Session['mode']) : session.mode,
    difficulty: fresh
      ? ($<HTMLSelectElement>('#difficulty-select').value as Session['difficulty'])
      : session.difficulty,
    undo: [],
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
  announce('New match started.');
}
$('#confirm-new').addEventListener('click', () => startNewMatch());
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
    session.state.result
      ? `Saved match: ${$('#status').textContent}. Game over. Play again to start a new match.`
      : 'Your saved match is ready to continue.',
  );
scheduleComputer();
