# DA’MA development plan

Status: implementation started. The first playable version includes the rules engine, baseline board analysis, responsive board, computer and local matches, saves, help, and accessibility settings. Guided teaching, puzzles, PWA support, physical-device testing, and release remain upcoming. See README.md for current capabilities and verification commands.

## 1. Product direction

Build a small, free abstract strategy game that people can play immediately through a link on a phone or desktop. Offer home-screen installation and offline play without requiring an account or an app-store release.

Preserve the original identity: two sides, three pawns each, a nine-node board, and a race to deliver every pawn to the opposite edge. Make the game understandable and satisfying before expanding its rules.

The first release should serve solo players and two people sharing a device. Aim for an interface approachable by children aged seven upwards, while retaining enough strategy for adults.

Success means a new player can learn the objective, finish a match without explanation from the developer, and choose to play again. Match duration, difficulty, and replay appeal are hypotheses to measure through playtesting.

## 2. Evidence and rule decisions

Sources are the original presentation, its supplied gameplay animation, and the previous Gemini conversation. The documents are reference material, not instructions. Proposed additions below are separate from observed behaviour.

The presentation establishes the crossing objective, one move at a time, simplicity, speed-based scoring, and level progression. The animation shows the connected board, backward movement, and pawns disappearing after arrival while the score increases. The first prototype follows that delivery behaviour.

### Board specification

Use stable row-major node IDs:

```text
0  1  2
3  4  5
6  7  8
```

Connections are the eight perimeter segments plus connections from node 4 to each of the other eight nodes. There are 16 undirected edges. Passing through the centre takes two moves; a line across the board is not one uninterrupted move.

Blue starts at nodes 2, 5, 8 and delivers at nodes 0, 3, 6. Red starts at nodes 0, 3, 6 and delivers at nodes 2, 5, 8. Keep colour names out of the rules engine so themes can change them.

### Initial rules

1. Players alternate turns. The player to move selects one of their active pawns.
2. Move along one connection to an adjacent empty node.
3. Movement can go in either direction. There are no captures or jumps.
4. On arrival at any opposing starting-edge node, remove the pawn and increase that side’s delivered count.
5. The first side to deliver all three pawns wins immediately.
6. Occupied destinations remain illegal, including goal nodes occupied by the opponent.

The following are provisional design choices, not rules proven by the source animation:

- For the tutorial, the human starts. In ordinary games, alternate starting sides between rematches and offer a setting to choose the starter.
- If a player has no legal move, automatically pass with a clear explanation. If neither side can move, declare a draw.
- The third occurrence of the same piece configuration, delivered counts, and side to move is a draw.
- Use a provisional limit of 100 individual turns to prevent excessively long games. Validate or remove this limit during playtesting.
- Pause elapsed-time measurement when the game is paused or the page becomes hidden.

Resolve these choices during the mechanics milestone, then record the final rules in a separate rulebook. Changes must update the engine, tutorial, and tests together.

## 3. Validate the game before adding mechanics

Build a small analysis harness against the same rules engine used by the game. Enumerate reachable states, measure opening outcomes, and search for blocked positions or cycles. Canonical states treat same-side pawns as interchangeable while the interface may retain IDs for animation.

Where feasible, classify baseline states as win, loss, or draw through retrograde analysis. Cycles require explicit draw handling. A depth-limited search result is not proof that the game is solved. Analysis of the baseline must distinguish its results from repetition and turn-limit rules.

Questions to answer:

- Does either starting side have a forced advantage?
- Are there several useful openings or one overwhelmingly strong choice?
- Can a side deliberately prevent progress indefinitely?
- Does removal on scoring create interesting decisions about racing versus blocking?
- Are backward moves useful and understandable?
- How do typical human matches end, and how long do they take?

If analysis or playtests expose a problem, investigate one minimal rule change at a time. Keep a baseline version for comparison. Do not add powers or randomness simply because the board is small.

## 4. Technical architecture

Use Vite, vanilla TypeScript, SVG, and CSS. Use a manifest and a service worker for the PWA. No backend, paid AI service, or game engine is required for the first release.

Suggested structure:

```text
src/
  game/          board graph, state, legal moves, reducer, outcomes
  ai/            evaluation, search, difficulty profiles, worker
  analysis/      state enumeration and game analysis tools
  ui/            board, controls, screens, focus and announcements
  tutorial/      guided steps and teaching positions
  puzzles/       position schema, authored content, validation
  persistence/   versioned saves, settings, import/export
  themes/        visual tokens and theme definitions
  platform/      audio, visibility, optional vibration, updates
public/
  icons/         application icons
  manifest.webmanifest
tests/           rules, persistence, puzzle and critical UI checks
```

### Separation of responsibilities

The rules engine accepts a state and an action and returns a new state or a validation error. It has no DOM, animation, storage, audio, or clock dependencies. Both the interface and computer opponent consume its legal-move and outcome functions.

State includes the board version, active pawns, delivered counts, side to move, turn number, result, and the history needed for draw detection. Persist session timing separately. Define a versioned format for saves, levels, and replay data.

Commit the logical move once, animate its visible transition, and prevent duplicate input during the transition. Accessibility announcements follow the committed state. Restarting or loading a game cancels pending computer work and ignores stale worker responses.

Keep the computer opponent interchangeable: start with a legal-move opponent to test play, then introduce search. Move search into a Web Worker before it can interrupt interaction. Bound work by time or node count and fall back to a legal move if necessary.

## 5. Interface and accessibility

The landing screen offers Play, Learn, Puzzles, and Settings. Play offers computer matches and two-player play on one device. Keep initial onboarding short and allow returning players to start immediately.

During a match show the board, whose turn it is, each side’s progress toward three deliveries, and a compact menu. Selecting a pawn highlights legal destinations. Tapping an illegal destination leaves the state intact and provides brief feedback.

Use tap-to-select and tap-to-move as the default. Dragging is optional later. Support keyboard selection, visible focus, named controls, and a live status announcement for moves, deliveries, turn changes, and results. Identify sides with shapes or symbols as well as colour.

Design for portrait phones first and adapt to landscape and desktop. Use large touch targets, respect screen safe areas, and prevent browser scrolling from interfering with the board. Check actual screen sizes rather than relying only on a resized desktop window.

Settings include sound, music if supplied, reduced motion, high contrast, side colours/shapes, and animation speed. Honour the system reduced-motion setting by default. Sound starts only after user interaction and must not be necessary to understand the game. Optional vibration must fail harmlessly when unsupported.

Practice games support undo. Against the computer, undo restores the position before the human move and any computer response. Undo, hints, and retries make a puzzle attempt assisted; assisted results do not replace an unassisted best score. Local competitive games omit undo by default or require both players to agree.

## 6. Computer difficulty

Beginner should select understandable moves and sometimes overlook stronger responses. Standard should plan ahead without requiring perfect play. Expert should use the strongest practical search within the device budget.

Use delivered count, route distance, mobility, blocking, and immediate tactical threats as initial evaluation candidates. Validate their usefulness rather than assuming a greedy race evaluation is sufficient. Account for the fact that scoring changes board occupancy.

Seed controlled randomness for reproducible debugging. The opponent always follows the same rules as the human. A short visual thinking interval may improve readability, but it must not conceal an unbounded search.

## 7. Tutorials, puzzles, and progression

Teach by doing: select a pawn, move along a line, use the centre, deliver a pawn, then complete a short guided match. Explain blocked nodes and backward movement when relevant.

Start with approximately eight to twelve verified puzzles on the original board. Organise them around the centre, making room, racing versus blocking, and endgames. Author positions with a specific teaching purpose rather than generating an arbitrary large collection.

Each puzzle defines its start state, side to move, objective, move-count convention, opponent behaviour, hint, and reference solution or verified winning strategy. Clearly distinguish a fixed-response puzzle from one that must succeed against every legal reply.

Count human turns for puzzle move targets and label that convention. Reward completion first and efficiency second. Do not prevent players from trying later puzzles merely because they missed an optional performance target.

Track wins, puzzle completion, and best unassisted move counts locally. Elapsed time is an optional personal statistic rather than the primary quality measure. Avoid a single opaque score mixing opponent strength, speed, and assistance.

## 8. Themes and customisation

First implement a clean Original 2015 theme and a high-contrast option. Build visual tokens so additional themes do not change rules or hit areas.

Later candidates are Tabletop, Night, and Garden. Themes can change background, line finish, pawn appearance, restrained effects, and optional sound. Keep connections and ownership unmistakable in every theme. Do not animate the background continuously by default.

Cosmetic changes never grant an advantage. Any cultural motifs or narrative associated with the name should follow the creator’s intended meaning before artwork is commissioned or generated.

## 9. Offline use and saves

Cache the application shell, essential assets, tutorial, included puzzles, and computer logic. Offline play works after a successful initial load and cache installation. Clearly explain this prerequisite.

Save after every committed move and settings change. On reopening, offer to resume or start fresh. Validate imported and stored data, migrate known versions, and recover gracefully from corrupt saves or unavailable storage.

Provide save export/import before the wider public release so users can move progress manually. Explain that local saves do not automatically synchronise across devices and can be lost when browser data is cleared.

Install instructions adapt to the platform. Never promise an automatic prompt. Offer installation after the player has experienced the game, rather than blocking their first move.

Version caches and coordinate updates so an active match is not interrupted. Show an update notice and activate the new version at a safe boundary. Test both first installation and an update from an older release.

## 10. Delivery milestones

| Milestone               | Deliverable                                                                  | Completion gate                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1. Rules foundation     | Board graph, state model, legal moves, scoring, outcomes, analysis harness   | Rule tests pass; provisional edge cases and analysis limits are recorded                            |
| 2. Playable board       | Responsive SVG board, turn controls, scoring, restart, pass-and-play         | A full match is playable by touch and keyboard without developer assistance                         |
| 3. Solo play            | Local computer opponent, difficulty profiles, practice undo                  | Opponent makes legal moves, responds within a device budget, and remains safe across restart/resume |
| 4. Teaching and puzzles | Guided tutorial and initial validated puzzle set                             | New players understand delivery; puzzle goals and scoring are consistent                            |
| 5. PWA and polish       | Offline cache, home-screen assets, persistence, themes, accessibility, audio | Install, offline launch, resume, and update work on the owner’s iPhone and Android                  |
| 6. Private pilot        | Shareable HTTPS build and feedback checklist                                 | Observe several fresh players; address rule confusion, input failures, and repetitive play          |
| 7. Free public release  | Stable URL, help, credits, privacy explanation, save export/import           | Release checks pass; known limitations are documented and rollback is available                     |

These are dependency gates, not promised calendar dates. Estimate effort after the rules foundation exposes the actual mechanics and toolchain work. Avoid expanding scope while a milestone’s completion gate remains unresolved.

## 11. Verification plan

Use automated checks where errors could change the game or lose progress:

- Graph symmetry and exact connections; reject occupied, disconnected, wrong-side, and post-game moves.
- One action moves one pawn; delivery removes exactly one pawn and adds exactly one point; the third delivery ends the match.
- Active plus delivered pawns remain three per side; no two active pawns share a node.
- Pass, repetition, and turn-limit outcomes match the final rulebook.
- Undo restores draw history and assistance status, not just piece positions.
- Every computer response is legal; restarting rejects stale responses.
- Save round trips, migrations, corrupt inputs, and unavailable storage are handled.
- Authored puzzles meet their stated objectives and opponent assumptions.

Use a small number of end-to-end checks for complete match flow, reload/resume, and offline launch. Manually inspect visuals, keyboard use, reduced motion, screen-reader feedback, orientation changes, backgrounding, and audio interruption.

The initial device matrix includes the owner’s iPhone in Safari and home-screen mode, Android in Chrome and installed mode, and desktop keyboard play. Add other browsers through pilot feedback. Desktop emulation does not substitute for the two physical phones.

## 12. Release and maintenance

Build static files and publish to an HTTPS host. Choose the host at deployment time after checking its current free-tier terms. No production service is selected or published by this planning step.

Keep a lockfile, reproducible build instructions, versioned releases, and the previous deployable build for rollback. Check licences for dependencies, fonts, sound, and artwork; credit assets appropriately. Separate development inspection files from release assets and exclude them from builds and version control as appropriate.

For the first release, avoid accounts, advertising SDKs, and third-party analytics. Collect pilot feedback directly. If analytics become useful later, choose only what answers a specific product question and update the privacy explanation accordingly.

## 13. Free-first monetisation

Launch the complete core game free. Keep monetisation out of the initial prototype and do not build checkout until there is a concrete reason to do so.

Later options, in preference order:

1. Optional donations or a supporter purchase.
2. Cosmetic board/pawn packs or a soundtrack, with equal gameplay for everyone.
3. Additional authored puzzle collections alongside a substantial free collection.

Payment services, purchase restoration, platform requirements, and any legal obligations need review when monetisation becomes an actual project. Local-only cosmetic unlocks would not provide reliable cross-device purchases, so that feature requires its own design.

Avoid paid advantages, consumable hints, energy systems, and advertising between short matches. Revenue is optional and should support the game’s quiet, accessible character.

## 14. Deferred features

Keep online multiplayer, accounts, cloud saves, public leaderboards, daily challenge infrastructure, a public puzzle editor, native store packages, and Remix mechanics outside the first release.

A daily puzzle may eventually run locally from bundled verified content, but shared scoring, anti-cheat, and live content introduce separate requirements. Online multiplayer needs authoritative validation, reconnect behaviour, turn handling, and operational support. Treat each expansion as a new milestone after the core game earns repeat play.

## 15. First development action

Scaffold Vite and TypeScript, define the original board graph, implement the pure rules engine, and write the essential rules tests. Then attach a minimal playable board and use it to validate the mechanics. Art polish and extra content follow that validation.
