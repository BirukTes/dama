# DA’MA

A free browser prototype of the original 2015 board game, built with vanilla TypeScript, Vite, SVG, and CSS. Rules and the computer opponent run on the player’s device.

Play the published version at [dama-jr8.pages.dev](https://dama-jr8.pages.dev/). Local changes appear there after a deployment.

## Development

Use Node.js 24 LTS and npm. On Windows, `npm.cmd` avoids PowerShell execution-policy issues with `npm.ps1`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the Local URL printed by Vite. On a phone connected to the same Wi-Fi, use the Network URL. Keep the PC and server running; allow Node.js through the private-network firewall if required. `localhost` on a phone refers to the phone itself.

## Checks

```powershell
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run analyze
npm.cmd run analyze:rivals
```

With the development server running:

```powershell
npm.cmd run test:browser
npm.cmd run test:appearance
npm.cmd run test:journey
npm.cmd run test:sound
npm.cmd run test:puzzles
```

Browser checks use installed Microsoft Edge. They cover complete matches, computer replies, undo, saved sessions, pause/navigation, keyboard controls, themes, scoring animations, reduced motion, portrait/landscape layouts, mouse/touch dragging, rival unlocks, and result deduplication. Screenshots go into the ignored `.inspection` directory. Desktop emulation does not replace testing on physical phones.

Run `npm.cmd run format` after editing. Prettier and EditorConfig keep formatting and line endings consistent. `package-lock.json` records the dependency versions.

## Gameplay

Each side starts with three pawns on one edge of a nine-node board. Move one pawn along one connection into an empty spot. Moving backwards is allowed; jumping and capturing are not. A pawn reaching the opposing edge leaves the board and scores one delivery. First to deliver three wins.

Provisional rules pass a blocked player and draw on mutual blocking, threefold repetition, or 100 individual turns including passes. A fresh match starts with Blue; rematches alternate the starting side.

The prototype supports computer matches and two-player practice on one device. Practice undo restores the previous human turn in solo mode. The computer follows the same rules, uses bounded search in a worker, and pauses on Home or while menus are open. Gentle and Standard are heuristic difficulties rather than proven optimal play.

Solo play follows a three-rival journey: Coral uses shorter lookahead, the Runner weights delivery and proximity more strongly, and the Guardian searches deeper and values restricting opposing movement. Win against each rival to unlock the next; either challenge setting counts. Rival profiles show playing styles and local win/loss/draw records. Results invite the next challenge, and finished matches count once across reloads. Older saved matches resume as Coral matches.

All rivals now take immediate wins and avoid an immediate losing reply when possible, including on Gentle. Completed iterative search depths share a 24,000-node decision budget; equivalent moves can vary and repeated routes are discouraged when viable. Guardian values both sides' deliveries equally rather than treating an even score as a reason to settle for a draw. These are heuristic styles; human difficulty and phone performance still need feedback.

## Puzzles

Home's **Puzzles** button opens six free challenges, ranging from one to four Blue moves. Deliver all remaining pawns before using the budget. Coral uses an exact bounded defence, independent of the selected rival and challenge setting. Every puzzle is reachable under the original rules and has been checked against every legal reply, including draw history and automatic passes.

Hints give a clue and a verified next move in a dialog. Completion records distinguish hinted and unassisted solutions, with best move counts. Retry and next-puzzle actions are available in results. Attempts save separately from regular matches, so trying a puzzle preserves an unfinished solo or local game. Return Home to continue that match; select the saved puzzle to resume its attempt. Puzzles do not unlock rivals or add to rival statistics.

See [puzzle and rival verification notes](docs/PUZZLES-AND-RIVALS.md) for goals, proof scope, benchmark method, and limitations.

## Interface and saves

- Home shows opponent cards, the selected rival's profile, a remembered challenge setting, and a direct Play button. Local play starts directly; replacing an unfinished match requires confirmation. Rules and Settings stay in the compact header.
- Pause, rules, settings, restart, and results use accessible dialogs. Result review and passed-turn notices keep the board in place.
- Light, Dark, and device-following themes, high contrast, reduced motion, optional sound, and Focus view save as preferences.
- Illustrated Help explains pawn symbols, selection, connected movement, and delivery. Pawns travel into their score markers; reduced motion keeps the score update and delivery message.
- Home fits typical phone and desktop viewports, with internal scrolling available on unusually short screens. Dialogs remain scrollable. Wide layouts stretch the board into a rectangle while pawns remain circular. Landscape Focus view hides the title header and keeps compact scores, turn status, and Pause beside the board.
- Focus attempts browser fullscreen and, on touch devices, landscape locking where supported. Unsupported browsers keep a responsive board and a dismissible portrait rotation hint. Leaving Focus or returning Home releases locks and fullscreen acquired by the game.
- Press and slide to drag a pawn directly. Legal drops snap into place; invalid drops slide back without taking a turn. Tap-to-move and keyboard controls remain available. Rotation and interrupted gestures cancel safely. Game text is non-selectable.

Matches, preferences, and opponent progress save in this browser. Clearing browser data can remove them; they do not synchronise across devices. Fonts are bundled locally using DM Sans under the SIL Open Font License. No account, backend, paid AI service, or external font request is required.

The original font copyright and licence are included in `public/licenses/dm-sans-OFL.txt` and copied into production builds.

## Analysis and limitations

The baseline analysis enumerates 2,044 reachable positions, including 10 automatic-pass transitions and no mutual-blocking terminal positions. Retrograde classification treats indefinite cycles as draws and finds both initial positions drawn under perfect play. This excludes threefold-repetition history and the 100-turn cap, and does not establish human match quality or final-ruleset balance.

Guided teaching, offline installation, safe updates, save export/import, and physical-phone validation of the new puzzle UI remain upcoming. The current build is not an installable/offline PWA. The next planned phase is the interactive tutorial, followed by offline installation; neither is part of this update. See [the immersive play and journey notes](docs/IMMERSIVE-JOURNEY.md) for the preceding interface update.

## Hosting

Connect [BirukTes/dama](https://github.com/BirukTes/dama) through Cloudflare **Pages → Connect to Git**. Use production branch `main`, framework preset `None`, build command `npm run build`, output directory `dist`, and leave the root directory blank. Node.js `24.21.0` is pinned in `.node-version`.

See [the deployment guide](docs/CLOUDFLARE-DEPLOYMENT.md) for dashboard steps, verification, caching, and updates. `npm.cmd run test:production` checks the built game while `npm.cmd run preview -- --port 4173` is running.

Direct Upload can accept the built folder or a release ZIP for manual testing. A Direct Upload project cannot later switch to Git integration; automatic deployments require a separate project. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

HTTP Wi-Fi previews are useful for phone testing; production PWA installation requires HTTPS. Hosting alone does not provide offline caching.

## Licence

The project code is licensed under [MIT](LICENSE), copyright 2026 Biruk Tes. Bundled DM Sans fonts retain their separate [SIL Open Font License](public/licenses/dm-sans-OFL.txt).

## Project files

- `src/game/`: pure rules, board graph, state, and outcomes.
- `src/ai/`: bounded search and worker.
- `src/analysis/`: baseline position enumeration and retrograde classification.
- `src/persistence/`: validated, versioned browser saves.
- `src/ui/`: page template and illustrated Help.
- `src/main.ts`: application controller, interaction, and animation.
- `src/style.css`: themes, responsive layout, and game styling.
- `tests/`: rules tests and browser checks.

See [the development plan](DA-MA-Development-Plan.md) for the roadmap and [the commit plan](docs/COMMIT-PLAN.md) for the proposed initial series.
