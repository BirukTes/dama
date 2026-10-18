import { mapFor, maps, type MapId } from '../game/maps';
import { helpMarkup } from './help';
import { tutorialMarkup } from './tutorial';
import { appIconMarkup } from './app-icons';
import { backupMarkup } from './backup';
import { achievementsMarkup } from './achievements';
export const boardLines = (id: MapId = 'classic') => {
  const { points, edges } = mapFor(id);
  return edges
    .map(
      ([a, b]) =>
        `<line x1="${points[a][0]}" y1="${points[a][1]}" x2="${points[b][0]}" y2="${points[b][1]}"/>`,
    )
    .join('');
};
export const boardNodes = (id: MapId = 'classic') =>
  mapFor(id)
    .points.map(
      ([x, y], n) =>
        `<button class="node" data-node="${n}" style="left:${x / 5}%;top:${y / 5}%"><span class="piece" aria-hidden="true"></span></button>`,
    )
    .join('');

export const template = /* HTML */ `
  <header class="masthead">
    <button class="wordmark" id="home-button" aria-label="DA’MA home">
      DA’MA
      <span class="wordmark-dot">.</span>
    </button>
    <span class="edition">THE ORIGINAL BOARD GAME</span>
    <nav class="header-actions" aria-label="Game help and settings">
      <button class="quiet" id="help-button">How to play</button>
      <button class="quiet" id="settings-button">
        Settings
        <span aria-hidden="true">⚙</span>
      </button>
    </nav>
  </header>
  <main id="home-screen" aria-label="Choose a match">
    <section class="play-lobby" aria-labelledby="lobby-title">
      <div class="lobby-heading">
        <div>
          <p class="eyebrow">THREE PAWNS. FIND YOUR WAY ACROSS.</p>
          <h1 id="lobby-title" class="sr-only">Choose how to play</h1>
          <div class="view-switch" id="track-select" role="radiogroup" aria-label="Play mode">
            <label>
              <input
                class="sr-only"
                type="radio"
                name="play-track"
                id="track-journey"
                value="journey"
                checked
              />
              <span>Journey</span>
            </label>
            <label id="puzzles-button">
              <input
                class="sr-only"
                type="radio"
                name="play-track"
                id="track-puzzles"
                value="puzzles"
              />
              <span>Puzzles</span>
            </label>
            <label>
              <input
                class="sr-only"
                type="radio"
                name="play-track"
                id="track-free-play"
                value="free-play"
              />
              <span>Free play</span>
            </label>
          </div>
        </div>
        <button class="primary" id="continue-button" hidden>
          <span id="continue-label">Continue match</span>
          <span class="continue-arrow" aria-hidden="true">→</span>
          <small id="continue-context"></small>
        </button>
      </div>
      <p class="journey-summary" id="journey-progress"></p>
      <section id="puzzle-home" aria-labelledby="puzzles-title" hidden>
        <div
          class="view-switch"
          id="puzzle-pack-select"
          role="radiogroup"
          aria-label="Puzzle map pack"
        >
          ${Object.values(maps)
            .map(
              (m) =>
                `<label><input class="sr-only" type="radio" name="puzzle-pack" id="pack-${m.id}" value="${m.id}" ${m.id === 'classic' ? 'checked' : ''}/><span>${m.name}</span></label>`,
            )
            .join('')}
        </div>
        <div class="puzzle-pack-heading">
          <div>
            <h2 id="puzzles-title">Classic · First steps</h2>
            <p id="pack-description">Short challenges. Play Blue; Coral defends.</p>
          </div>
          <div class="puzzle-pack-actions">
            <p id="pack-progress"></p>
            <button class="quiet" id="resume-puzzle" hidden></button>
          </div>
        </div>
        <div id="puzzle-list" class="puzzle-list"></div>
      </section>
      <div class="opponent-cards" id="opponent-cards" aria-label="Choose an opponent"></div>
      <div class="lobby-bottom">
        <section
          class="opponent-profile"
          id="opponent-profile"
          aria-live="polite"
          aria-atomic="true"
        ></section>
        <div class="lobby-controls">
          <div class="field" id="map-field">
            <div class="view-switch" id="map-select" role="radiogroup" aria-label="Board map">
              ${Object.values(maps)
                .map(
                  (m) =>
                    `<label><input class="sr-only" type="radio" name="board-map" id="map-${m.id}" value="${m.id}" ${m.id === 'classic' ? 'checked' : ''}/><span>${m.name}<small data-map-progress="${m.id}"></small></span></label>`,
                )
                .join('')}
            </div>
          </div>
          <div class="field" id="difficulty-field">
            <div
              class="view-switch"
              id="difficulty-select"
              role="radiogroup"
              aria-label="Challenge setting"
            >
              <label>
                <input
                  class="sr-only"
                  type="radio"
                  name="challenge"
                  id="difficulty-gentle"
                  value="gentle"
                />
                <span>Gentle</span>
              </label>
              <label>
                <input
                  class="sr-only"
                  type="radio"
                  name="challenge"
                  id="difficulty-standard"
                  value="standard"
                  checked
                />
                <span>Standard</span>
              </label>
            </div>
          </div>
          <button class="primary" id="start-button">Play Coral →</button>
          <button class="quiet" id="local-button">
            Play with a friend
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
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
          <div class="view-switch" id="view-control" role="radiogroup" aria-label="Board view">
            <label>
              <input
                class="sr-only"
                type="radio"
                name="board-view"
                id="view-standard"
                value="standard"
                checked
              />
              <span>Standard</span>
            </label>
            <label>
              <input class="sr-only" type="radio" name="board-view" id="view-focus" value="focus" />
              <span>Focus</span>
            </label>
          </div>
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
        <span class="board-map-label" id="board-map-label">Classic</span>
        <div class="goal-edge coral-edge" aria-hidden="true"></div>
        <div class="goal-edge blue-edge" aria-hidden="true"></div>
        <div
          class="board"
          id="board"
          role="group"
          aria-label="Board. Drag your pawn to a connected empty spot, or tap a pawn then its destination."
        >
          <svg viewBox="0 0 500 500" preserveAspectRatio="none" aria-hidden="true">
            ${boardLines()}
          </svg>
          ${boardNodes()}
        </div>
      </div>
      <div class="rotation-hint" id="rotation-hint" hidden>
        Rotate your phone for a wider board.
        <button class="quiet" id="dismiss-rotation" aria-label="Dismiss rotation hint">×</button>
      </div>
      <div class="turn-panel">
        <span class="turn-dot" id="turn-dot" aria-hidden="true"></span>
        <div>
          <h2 id="status"></h2>
          <p id="instruction"></p>
        </div>
        <button class="quiet undo" id="undo-button">Undo</button>
        <button class="quiet" id="puzzle-hint" hidden>Hint</button>
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
    <p class="dialog-note" id="journey-result" hidden></p>
    <p class="dialog-note" id="achievement-notice" hidden></p>
    <div class="dialog-actions">
      <button class="primary" id="next-opponent" hidden>Next challenge →</button>
      <button class="primary" id="next-puzzle" hidden>Next puzzle →</button>
      <button class="primary" id="play-again" autofocus>Play again ↻</button>
      <button class="quiet" id="practice-rival" hidden>Practice this rival · with undo</button>
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
    <p class="dialog-note" id="match-rules"></p>
    <div class="pause-actions">
      <button class="primary close">Resume play →</button>
      <button class="quiet" id="pause-settings">Settings</button>
      <button class="quiet" id="pause-help">Rules</button>
      <button class="quiet" id="pause-new">New match ↻</button>
      <button class="quiet go-home">Save & return home</button>
    </div>
  </dialog>
  ${helpMarkup} ${tutorialMarkup}
  <dialog id="puzzle-hint-dialog" aria-labelledby="puzzle-hint-title">
    <div class="dialog-top">
      <p class="eyebrow">A SMALL NUDGE</p>
      <button class="quiet close" aria-label="Close hint">Close ×</button>
    </div>
    <h2 id="puzzle-hint-title">Try this route.</h2>
    <p class="dialog-note" id="puzzle-hint-text"></p>
    <button class="primary close">Back to puzzle →</button>
  </dialog>
  <div id="pwa-update-toast" role="status" hidden>
    <span>A new version is ready.</span>
    <button class="quiet" id="pwa-update">Update &amp; reload</button>
  </div>
  <dialog id="settings" aria-labelledby="settings-title">
    <div class="dialog-top">
      <p class="eyebrow">MAKE YOURSELF AT HOME</p>
      <button class="quiet close" aria-label="Close settings">Close ×</button>
    </div>
    <h2 id="settings-title">Your kind of play.</h2>
    <label class="field">
      Theme
      <select id="theme">
        <option value="system">Use device setting</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    ${appIconMarkup}
    <details id="pwa-settings">
      <summary>Install &amp; offline play</summary>
      <p id="pwa-status" class="dialog-note" role="status"></p>
      <p id="pwa-installed" class="dialog-note" hidden>Running as a home-screen app.</p>
      <button class="quiet" id="pwa-install">How to install</button>
      <p id="pwa-install-help" class="dialog-note" hidden></p>
      <button class="quiet" id="pwa-retry" hidden>Prepare offline play</button>
      <p id="pwa-update-note" class="dialog-note" hidden></p>
      <button class="quiet" id="pwa-update-settings" hidden>Update &amp; reload</button>
    </details>
    ${backupMarkup} ${achievementsMarkup}
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
      <input type="checkbox" id="sound" checked />
      Move sounds
    </label>
    <p class="dialog-note">
      Focus view keeps scores and turn status visible. Your match saves on this browser. Clearing
      browser data removes it. Open Install &amp; offline play above to check this device’s
      readiness.
    </p>
    <button class="primary close">Done</button>
    <p class="dialog-note">
      DA’MA began as a college game idea in 2015. Three pawns, nine places, and a way across for
      everyone.
    </p>
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
  <dialog id="restart" aria-labelledby="restart-title" aria-describedby="restart-detail">
    <div class="dialog-top">
      <p class="eyebrow">A FRESH START</p>
      <button class="quiet close" aria-label="Cancel new match">Close ×</button>
    </div>
    <h2 id="restart-title">Another way across?</h2>
    <p class="dialog-note" id="restart-detail">This replaces your unfinished match.</p>
    <button class="primary" id="confirm-new">Start new match</button>
    <button class="quiet close">Keep playing</button>
  </dialog>
`;
