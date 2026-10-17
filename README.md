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
npm.cmd run analyze -- crossroads
npm.cmd run analyze -- long-crossing
```

With the development server running:

```powershell
npm.cmd run test:browser
npm.cmd run test:appearance
npm.cmd run test:journey
npm.cmd run test:progression
npm.cmd run test:modes
npm.cmd run test:icons
npm.cmd run test:offline
npm.cmd run test:tutorial
npm.cmd run test:sound
npm.cmd run test:puzzles
npm.cmd run test:maps
```

Browser checks use installed Microsoft Edge. They cover complete matches, computer replies, undo, saved sessions, pause/navigation, keyboard controls, themes, scoring animations, reduced motion, portrait/landscape layouts, mouse/touch dragging, rival unlocks, and result deduplication. Screenshots go into the ignored `.inspection` directory. Desktop emulation does not replace testing on physical phones.

Run `npm.cmd run format` after editing. Prettier and EditorConfig keep formatting and line endings consistent. `package-lock.json` records the dependency versions.

## Gameplay

Each side starts with three pawns on one edge of the selected board. Move one pawn along one connection into an empty spot. Moving backwards is allowed; jumping and capturing are not. A pawn reaching the opposing edge leaves the board and scores one delivery. First to deliver three wins.

Provisional rules pass a blocked player and draw on mutual blocking, threefold repetition, or 100 individual turns including passes. A fresh match starts with Blue; rematches alternate the starting side.

The prototype supports computer matches and two-player practice on one device. Practice undo restores the previous human turn in solo mode. The computer follows the same rules, uses bounded search in a worker, and pauses on Home or while menus are open. Gentle and Standard are heuristic difficulties rather than proven optimal play.

Journey mode follows a separate three-rival journey on each map: Coral uses shorter lookahead, the Runner weights delivery and proximity more strongly, and the Guardian searches deeper and values restricting opposing movement. Win against each rival to unlock the next; either challenge setting counts. Rival profiles show playing styles and that map’s local win/loss/draw records. All maps are available from the start; each unlocks rivals independently. Free play offers every rival immediately and supports a friend on the same device, without changing Journey records. Results invite the next challenge, and finished matches count once across reloads. Older saved matches resume as Coral matches.

All rivals now take immediate wins and avoid an immediate losing reply when possible, including on Gentle. Completed iterative search depths share a 24,000-node decision budget; equivalent moves can vary and repeated routes are discouraged when viable. Guardian values both sides' deliveries equally rather than treating an even score as a reason to settle for a draw. These are heuristic styles; human difficulty and phone performance still need feedback.

## Board maps

Home's board selector offers six maps: **Classic** (9 spots), **Crossroads** (9), **Ring Road** (9), **Twin Bridges** (12), **Long Crossing** (15), and **Islands** (9, including a passing bay). All use three pawns per side, opposite-edge delivery, and the same move/pass/draw rules. Larger maps use a wider layout. Both computer and local play support every map; undo, rematches, keyboard navigation and saves retain the correct graph. Older saves load as Classic.

All six maps have independent Journey records and rival unlocks. Free play makes every rival available on any map without affecting those records. Existing Classic progress is preserved; older alternative-board practice saves remain Free play. The six authored puzzles remain on Classic and save separately. See [the game structure](docs/GAME-STRUCTURE.md) and [the board catalogue and validation](docs/BOARD-MAPS.md) for shapes, analysis and playtesting limits, and [the original Crossroads delivery notes](docs/CROSSROADS.md).

## Interactive help

Open **How to play → Try guided lesson**, or **Pause → Rules** while playing. Six hands-on Classic positions teach one-connection moves, the centre stop, delivery, backwards movement, automatic passes and the third-delivery win. Tap, drag or use keyboard controls. Back, Reset and Exit are always available; you advance after making the guided move. Completion enables a replay label.

The lesson runs in its own modal board. It never replaces a match, puzzle attempt or Journey record. Exiting from Pause returns to Pause; the computer stays stopped until Resume. See [the lesson notes](docs/INTERACTIVE-HELP.md).

## Puzzles

Home's **Puzzles** tab shows the **Classic · First steps** pack of six free challenges, ranging from one to four Blue moves. Deliver all remaining pawns before using the budget. Coral uses an exact bounded defence, independent of the selected rival and challenge setting. Every puzzle is reachable under the original rules and has been checked against every legal reply, including draw history and automatic passes.

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

The interactive tutorial and installable/offline production build are available. Save export/import, further challenge packs, difficulty tuning and physical-phone validation remain upcoming. See [the immersive play and journey notes](docs/IMMERSIVE-JOURNEY.md) for the preceding interface update.

## App icons and installation testing

Settings → **App icon** offers Monogram Dark (default), Monogram Light, Board Light and Board Dark. Icon choice is independent of the game theme and persists on this browser. Choose one and open its installation preview; that page declares the matching manifest and Apple touch icon before loading any JavaScript. All variants identify the same DA’MA app.

Each set includes 32px favicon, 180px Apple touch icon, 192/512px app icons and a separate 512px maskable export. Generated masters and prompt briefs are in [design/app-icons](design/app-icons/README.md). The normal build uses committed exports, without an image-generation dependency.

The production build also prepares offline play after the first online visit. Native installation and existing-icon updates are browser-controlled. Use the HTTPS deployment for phone installation testing; test the chosen result on a physical device. See [icon and installation notes](docs/APP-ICONS.md).

## Hosting

Connect [BirukTes/dama](https://github.com/BirukTes/dama) through Cloudflare **Pages → Connect to Git**. Use production branch `main`, framework preset `None`, build command `npm run build`, output directory `dist`, and leave the root directory blank. Node.js `24.21.0` is pinned in `.node-version`.

See [the deployment guide](docs/CLOUDFLARE-DEPLOYMENT.md) for dashboard steps, verification, caching, and updates. `npm.cmd run test:production` checks the built game while `npm.cmd run preview -- --port 4173` is running.

Direct Upload can accept the built folder or a release ZIP for manual testing. A Direct Upload project cannot later switch to Git integration; automatic deployments require a separate project. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

HTTP Wi-Fi previews are useful for phone testing; use the HTTPS deployment for phone installation and offline caching. Open **Settings → Install & offline play** and wait for **Ready for offline play** before disconnecting. Development mode intentionally does not register a service worker; test offline behaviour with `npm.cmd run build` and `npm.cmd run preview -- --port 4173`.

## Offline play and updates

The production build caches the complete game, all six maps, both AI workers’ logic, puzzles, tutorial, fonts, icon choices and installation previews. No account is required. In **Settings → Install & offline play**, check download readiness, request installation when supported, or read iPhone Add to Home Screen instructions. Installed-app detection hides installation guidance when running standalone; a browser tab is not assumed to mean the app is uninstalled.

New releases download in the background and wait. An **Update & reload** action is available from Home, including Home’s Settings. It verifies current saves before activation and asks you to close other DA’MA windows first. Updates never reload an ongoing game automatically. Application caches are separate from saved progress, and the previous release remains cached during handover. A failed or mismatched download cannot replace the working release.

See [offline and installation notes](docs/OFFLINE-INSTALLATION.md) for testing, cache recovery, deployment and browser limits. Physical iPhone/Android installation checks remain necessary.

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
