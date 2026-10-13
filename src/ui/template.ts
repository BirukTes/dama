import { edges } from '../game/rules';
import { helpMarkup } from './help';
export const points = Array.from({ length: 9 }, (_, n) => [
  80 + (n % 3) * 170,
  80 + Math.floor(n / 3) * 170,
]);

export const template = /* HTML */ `
  <header class="masthead">
    <button class="wordmark" id="home-button" aria-label="DA’MA home">
      DA’MA
      <span class="wordmark-dot">.</span>
    </button>
    <span class="edition">THE ORIGINAL BOARD GAME</span>
    <button class="quiet" id="settings-button">
      Settings
      <span aria-hidden="true">⚙</span>
    </button>
  </header>
  <main id="home-screen" aria-label="Home">
    <section class="intro">
      <p class="eyebrow">A LITTLE BOARD. A LITTLE STRATEGY.</p>
      <h1>
        Find your way
        <br />
        <em>across.</em>
      </h1>
      <p class="lede">
        Three pawns each. Nine places to move.
        <br />
        Bring yours to the other side first.
      </p>
      <button class="text-link" id="help-button">
        How to play
        <span aria-hidden="true">↗</span>
      </button>
      <div class="intro-note">
        <span class="small-mark" aria-hidden="true">✳</span>
        <p>
          A college idea from 2015,
          <br />
          finding a new way to play.
        </p>
      </div>
    </section>
    <section class="home-actions" aria-label="Choose how to play">
      <p class="eyebrow">TAKE A SEAT</p>
      <h2>
        A way across
        <br />
        for everyone.
      </h2>
      <button class="primary home-choice" id="continue-button" hidden>
        <span id="continue-label">Continue match</span>
        <span aria-hidden="true">→</span>
      </button>
      <button class="home-choice" id="solo-button">
        <span>
          Play the computer
          <small>A quiet challenge, at your pace.</small>
        </span>
        <span aria-hidden="true">→</span>
      </button>
      <button class="home-choice" id="local-button">
        <span>
          Two players
          <small>One board. Share this device.</small>
        </span>
        <span aria-hidden="true">→</span>
      </button>
      <button class="quiet" id="learn-button">
        Learn the rules
        <span aria-hidden="true">↗</span>
      </button>
    </section>
  </main>
  <main id="play-screen" aria-label="Play" hidden>
    <section class="game" aria-label="DA’MA game">
      <div class="game-top">
        <span class="eyebrow" id="mode-label"></span>
        <div class="game-actions">
          <button class="quiet" id="new-button">
            New match
            <span aria-hidden="true">↻</span>
          </button>
          <button class="quiet" id="view-button" aria-pressed="false">Focus view</button>
          <button class="quiet" id="pause-button">
            Pause
            <span aria-hidden="true">Ⅱ</span>
          </button>
        </div>
      </div>
      <div class="scoreboard">
        <div class="score coral">
          <span class="side-label" id="coral-label"></span>
          <div class="score-track">
            <div class="deliveries" id="coral-score" aria-label="Coral delivered"></div>
            <span class="score-count" id="coral-count"></span>
          </div>
          <span class="direction">CROSS TO THE RIGHT →</span>
        </div>
        <div class="score blue">
          <span class="side-label" id="blue-label"></span>
          <div class="score-track">
            <div class="deliveries" id="blue-score" aria-label="Blue delivered"></div>
            <span class="score-count" id="blue-count"></span>
          </div>
          <span class="direction">← CROSS TO THE LEFT</span>
        </div>
      </div>
      <p class="pass-notice" id="pass-notice" hidden></p>
      <p class="delivery-notice" id="delivery-notice" hidden></p>
      <div class="board-shell">
        <div class="goal-edge coral-edge" aria-hidden="true"></div>
        <div class="goal-edge blue-edge" aria-hidden="true"></div>
        <div
          class="board"
          id="board"
          role="group"
          aria-label="Board. Select your pawn, then an empty connected destination."
        >
          <svg viewBox="0 0 500 500" aria-hidden="true">
            ${edges.map(([a, b]) => `<line x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}"/>`).join('')}
          </svg>
          ${points.map(([x, y], n) => `<button class="node" data-node="${n}" style="left:${x / 5}%;top:${y / 5}%"><span class="piece" aria-hidden="true"></span></button>`).join('')}
        </div>
      </div>
      <div class="turn-panel">
        <span class="turn-dot" id="turn-dot" aria-hidden="true"></span>
        <div>
          <h2 id="status"></h2>
          <p id="instruction"></p>
        </div>
        <button class="quiet undo" id="undo-button">Undo</button>
      </div>
      <div class="game-bottom">
        <span id="move-count"></span>
        <span id="save-status"></span>
      </div>
    </section>
  </main>
  <footer>
    <span>Made for a moment of play.</span>
    <a
      class="source-link"
      href="https://github.com/BirukTes/dama"
      target="_blank"
      rel="noopener noreferrer"
    >
      Source on GitHub ↗
    </a>
    <span>
      FREE TO PLAY
      <span aria-hidden="true">·</span>
      NO ACCOUNT NEEDED
    </span>
  </footer>
  <p class="sr-only" id="announcement" role="status" aria-live="polite" aria-atomic="true"></p>
  <dialog
    class="result-panel"
    id="result-panel"
    aria-labelledby="result-title"
    aria-describedby="result-detail final-score"
  >
    <div class="dialog-top">
      <p class="eyebrow">GAME OVER</p>
      <button class="quiet close" aria-label="Close result and review the board">
        Review board ×
      </button>
    </div>
    <h2 id="result-title"></h2>
    <p id="result-detail"></p>
    <p class="final-score" id="final-score"></p>
    <div class="dialog-actions">
      <button class="primary" id="play-again" autofocus>Play again ↻</button>
      <button class="quiet go-home">Home</button>
    </div>
  </dialog>
  <dialog id="pause" aria-labelledby="pause-title">
    <div class="dialog-top">
      <p class="eyebrow">A MOMENT TO THINK</p>
      <button class="quiet close" aria-label="Close pause menu">Close ×</button>
    </div>
    <h2 id="pause-title">Take your time.</h2>
    <p class="dialog-note">Your match is saved. Pick up where you left off.</p>
    <div class="pause-actions">
      <button class="primary close">Resume play →</button>
      <button class="quiet" id="pause-settings">Settings</button>
      <button class="quiet" id="pause-help">Rules</button>
      <button class="quiet" id="pause-new">New match ↻</button>
      <button class="quiet go-home">Save & return home</button>
    </div>
  </dialog>
  <dialog id="setup" aria-labelledby="setup-title">
    <div class="dialog-top">
      <p class="eyebrow">YOUR NEXT MATCH</p>
      <button class="quiet close" aria-label="Cancel match setup">Close ×</button>
    </div>
    <h2 id="setup-title">Choose your seat.</h2>
    <label class="field">
      Players
      <select id="mode-select">
        <option value="solo">You + computer</option>
        <option value="local">Two players</option>
      </select>
    </label>
    <label class="field" id="difficulty-field">
      Computer
      <select id="difficulty-select">
        <option value="gentle">Gentle</option>
        <option value="standard">Standard</option>
      </select>
    </label>
    <p class="dialog-note" id="setup-note"></p>
    <button class="primary" id="start-button">Start match →</button>
  </dialog>
  ${helpMarkup}
  <dialog id="settings">
    <div class="dialog-top">
      <p class="eyebrow">MAKE YOURSELF AT HOME</p>
      <button class="quiet close" aria-label="Close settings">Close ×</button>
    </div>
    <h2>Your kind of play.</h2>
    <label class="field">
      Theme
      <select id="theme">
        <option value="system">Use device setting</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    <label class="check">
      <input type="checkbox" id="immersive" />
      Focus view · more board, fewer tips
    </label>
    <label class="check">
      <input type="checkbox" id="contrast" />
      High contrast
    </label>
    <label class="check">
      <input type="checkbox" id="motion" />
      Reduce motion
    </label>
    <label class="check">
      <input type="checkbox" id="sound" />
      Move sounds
    </label>
    <p class="dialog-note">
      Focus view keeps scores and turn status visible. Your match saves on this browser. Clearing
      browser data removes it. Offline installation comes in a later milestone.
    </p>
    <button class="primary close">Done</button>
    <div class="about-links" aria-label="About DA’MA">
      <a href="https://github.com/BirukTes/dama" target="_blank" rel="noopener noreferrer">
        Source &amp; issues on GitHub ↗
      </a>
      <a
        href="https://github.com/BirukTes/dama/blob/main/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
      >
        Code licensed under MIT ↗
      </a>
    </div>
  </dialog>
  <dialog id="restart">
    <div class="dialog-top">
      <p class="eyebrow">A FRESH START</p>
      <button class="quiet close" aria-label="Cancel new match">Close ×</button>
    </div>
    <h2>Another way across?</h2>
    <p class="dialog-note">
      Start a new match with the same players and difficulty. This replaces the current match.
    </p>
    <button class="primary" id="confirm-new">Start new match</button>
    <button class="quiet close">Keep playing</button>
  </dialog>
`;
