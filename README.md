# DA’MA

A free browser prototype of the original 2015 board game, built with vanilla TypeScript, Vite, SVG, and CSS. Rules and the computer opponent run on the player’s device.

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
```

With the development server running:

```powershell
npm.cmd run test:browser
npm.cmd run test:appearance
```

Browser checks use installed Microsoft Edge. They cover complete matches, computer replies, undo, saved sessions, pause/navigation, keyboard controls, themes, scoring animations, reduced motion, and portrait/landscape layouts. Screenshots go into the ignored `.inspection` directory. Desktop emulation does not replace testing on physical phones.

Run `npm.cmd run format` after editing. Prettier and EditorConfig keep formatting and line endings consistent. `package-lock.json` records the dependency versions.

## Gameplay

Each side starts with three pawns on one edge of a nine-node board. Move one pawn along one connection into an empty spot. Moving backwards is allowed; jumping and capturing are not. A pawn reaching the opposing edge leaves the board and scores one delivery. First to deliver three wins.

Provisional rules pass a blocked player and draw on mutual blocking, threefold repetition, or 100 individual turns including passes. A fresh match starts with Blue; rematches alternate the starting side.

The prototype supports computer matches and two-player practice on one device. Practice undo restores the previous human turn in solo mode. The computer follows the same rules, uses bounded search in a worker, and pauses on Home or while menus are open. Gentle and Standard are heuristic difficulties rather than proven optimal play.

## Interface and saves

- Home offers match setup, rules, and saved-match continuation. Play focuses on the board.
- Pause, rules, settings, restart, and results use accessible dialogs. Result review and passed-turn notices keep the board in place.
- Light, Dark, and device-following themes, high contrast, reduced motion, optional sound, and Focus view save as preferences.
- Illustrated Help explains pawn symbols, selection, connected movement, and delivery. Pawns travel into their score markers; reduced motion keeps the score update and delivery message.
- Home fits the viewport without page scrolling. Dialogs remain scrollable. Landscape Focus view gives the board more space and puts navigation in Pause.
- Touch and keyboard play use large targets, visible focus, ownership symbols, and live announcements. Game text is non-selectable.

Matches and preferences save in this browser. Clearing browser data can remove them; they do not synchronise across devices. Fonts are bundled locally using DM Sans under the SIL Open Font License. No account, backend, paid AI service, or external font request is required.

The original font copyright and licence are included in `public/licenses/dm-sans-OFL.txt` and copied into production builds.

## Analysis and limitations

The baseline analysis enumerates 2,044 reachable positions, including 10 automatic-pass transitions and no mutual-blocking terminal positions. Retrograde classification treats indefinite cycles as draws and finds both initial positions drawn under perfect play. This excludes threefold-repetition history and the 100-turn cap, and does not establish human match quality or final-ruleset balance.

Guided teaching, authored puzzles, offline installation, safe updates, save export/import, physical-phone testing, and public hosting remain upcoming. The current build is not an installable/offline PWA.

## Hosting

Cloudflare Pages is the selected hosting direction. For Git-integrated deployment, use a separate repository, Node.js 24, build command `npm run build`, and output directory `dist`.

Direct Upload can accept the built folder or a release ZIP for manual testing. A Direct Upload project cannot later switch to Git integration; automatic deployments require a separate project. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

HTTP Wi-Fi previews are useful for phone testing; production PWA installation requires HTTPS. Hosting alone does not provide offline caching.

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
