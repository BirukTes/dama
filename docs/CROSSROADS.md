# Crossroads: first alternative board

These are the original delivery notes. The later [game structure](GAME-STRUCTURE.md) adds independent Journey progression to every map and keeps unrestricted rivals in Free play.

## Delivery plan

1. Keep the original nine positions, three pawns per side, opposite-edge delivery, backward movement, pass and draw rules.
2. Remove only the four centre-to-corner diagonals: 4–0, 4–2, 4–6 and 4–8. Retain the outer loop and centre connections to 1, 3, 5 and 7. This is a 3 × 3 orthogonal grid with 12 undirected edges.
3. Add Classic/Crossroads selection on Home, remember the choice and display the active map on the board. Choosing a different map affects the next new match, with confirmation before replacing an unfinished match.
4. Make legality, AI graph distances, rendering, drag destinations, undo, rematches and saves use the match's map. Treat saves without a map as Classic; reject invalid or mixed-map save histories.
5. Deliver Crossroads as optional practice with every rival available. Keep Classic rival records/unlocks intact. Keep all six verified puzzles on Classic.
6. Verify graph structure, deliveries, complete games, both starters, save compatibility, mobile layouts, Focus view, and the production worker before committing. Assess human balance through playtesting after delivery.

This scope is implemented locally on 17 October 2026. Tutorial, offline installation, new puzzle content, other board shapes and production publishing are outside this change.

## How to play

Select **Crossroads** in Home's board-map radio grid, then Play a rival or Play with a friend. The adjacent **Gentle | Standard** control sets difficulty. Both choices remain visible, highlight the active option, remember the preference, and support keyboard arrows. Pawns move one horizontal or vertical connection into an empty spot. Corner pawns must go along an edge before reaching the central junction; centre pawns cannot deliver diagonally. Dragging, tapping and keyboard controls work as before.

Crossroads rematches retain the map and alternate the starting player. Changing Home's selector does not mutate an unfinished match. Opening a puzzle uses Classic; returning Home restores the previous regular match with its own map. Classic saves and puzzle proofs remain compatible.

## Baseline analysis

Run `npm.cmd run analyze` for Classic and `npm.cmd run analyze -- crossroads` for Crossroads.

| Measure                                      | Classic | Crossroads |
| -------------------------------------------- | ------- | ---------- |
| Connections                                  | 16      | 12         |
| Centre neighbours                            | 8       | 4          |
| Reachable baseline positions                 | 2,044   | 2,038      |
| Baseline drawn positions                     | 1,222   | 1,420      |
| Automatic pass transitions                   | 10      | 6          |
| Reachable mutual-blocking terminal positions | 0       | 0          |
| Blue starts, perfect baseline play           | Draw    | Draw       |
| Coral starts, perfect baseline play          | Draw    | Draw       |

The baseline discards repetition history and the turn cap, treating indefinite cycles as draws. The live game still applies threefold repetition and the 100-turn limit. No starting side has a forced win in this baseline, but this does not establish equal human win rates or enjoyable balance. Crossroads has a larger drawn region; watch for centre standoffs and repeated blocking before introducing competitive progression on it.

Rival evaluation uses precomputed distances from the selected graph rather than Classic shortcuts. The existing tactical checks and search budget still apply. No claim is made that the three styles have been calibrated equally well on both maps.

## Verification and next feedback

Unit tests check all 12 edges are orthogonal and symmetric, reject diagonal movement, retain scoring, play seeded complete matches with every rival and both starters, reject invalid/mixed-map saves, and exclude practice from Classic progress. Existing Classic rule and exact puzzle proof tests remain in the suite.

`npm.cmd run test:maps` checks selection, practice availability, displayed paths, illegal diagonal clicks, real worker replies, rematch/reload, map-choice protection, Classic puzzle transitions, a complete Crossroads match, and phone/desktop/Focus layouts. The production smoke test includes a Crossroads worker reply and then a Classic puzzle while preserving the Crossroads match.

On a physical phone, check the map selector, pawn dragging, recognisable map label and comfortable target sizes. During playtesting, note whether the centre feels like an interesting choice or an obligatory bottleneck, whether using the outer routes helps, draw frequency, and the length of a satisfying match.
