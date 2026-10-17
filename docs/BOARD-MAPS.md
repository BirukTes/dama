# Board maps

Choose a map on Home, then a rival or a friend. Journey mode gives every map its own Coral → Runner → Guardian progression. All maps are available from the start. Free play makes every rival available and excludes its results from Journey records. Changing the choice only affects a new match. An unfinished match requires confirmation before replacement. Rematches retain the map and alternate starters. Puzzles remain Classic.

Every map has three pawns per side. Blue starts on the right and delivers to any of the three left-edge goals; the rival does the reverse. Follow one visible connection per turn. Deliveries remove pawns, backwards moves are legal, blocked turns pass, and repetition/100-turn draws still apply. Larger boards add manoeuvring space rather than extra pawns.

| Map           | Spots | Connections | Shape and play                                                                                                                                |
| ------------- | ----: | ----------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Classic       |     9 |          16 | Original perimeter and eight centre approaches; fastest diagonal routes.                                                                      |
| Crossroads    |     9 |          12 | Three-by-three orthogonal grid; no diagonals.                                                                                                 |
| Ring Road     |     9 |          10 | Perimeter loop with a vertical link through the centre. Cross along the upper or lower road.                                                  |
| Twin Bridges  |    12 |          16 | Three rows, four columns, with the central horizontal link removed. Cross between banks on the top or bottom bridge.                          |
| Long Crossing |    15 |          22 | Three rows, five columns, with full orthogonal connections. More staging space and a longer delivery route.                                   |
| Islands       |     9 |          11 | Two three-spot banks, two landings and a passing bay. Each landing reaches its bank's upper/lower spot. The landings and bay form a triangle. |

Islands adds a passing bay to the earlier single-bridge sketch. It lets pawns move aside when opponents meet on the crossing. Blocking and retreating remain possible; the bay does not guarantee a decisive game.

Rendering, drag targets, spatial keyboard navigation, delivery animation, AI distances/threats, undo, rematches, saves and goal detection all use the selected map. Wider maps keep enough horizontal room for distinct touch targets in portrait, including Focus with the rotation hint visible. Home keeps all six choices visible using radio buttons.

## Validation

Full-rule breadth-first checks find a reachable win for **both colours from the starting position on every map**, with actual repetition history and turn limits. Seeded games cover all three rivals and both starters, check every computer move for legality, and validate every saved state through termination. Saves reject wrong lengths and mixed-map histories/undo. Existing Classic puzzle proofs still pass.

Baseline graph analysis (`npm.cmd run analyze -- <map-id>`) gives:

| Map ID        | Reachable positions | Winning terminal positions | Mutual-blocking terminals | Pass transitions | Perfect baseline start, either colour |
| ------------- | ------------------: | -------------------------: | ------------------------: | ---------------: | ------------------------------------- |
| classic       |               2,044 |                         72 |                         0 |               10 | Draw                                  |
| crossroads    |               2,038 |                         66 |                         0 |                6 | Draw                                  |
| ring-road     |               2,006 |                         50 |                         0 |               60 | Draw                                  |
| twin-bridges  |              18,902 |                        242 |                         0 |               28 | Draw                                  |
| long-crossing |             105,898 |                        580 |                         0 |               54 | Draw                                  |
| islands       |               1,856 |                         34 |                         0 |              144 | Draw                                  |

The baseline omits repetition history and turn limits, classifying indefinite cycles as draws. These results establish graph reachability, not human difficulty or replay quality. A perfect baseline draw is also the case for Classic. Alternative-map rival strength remains provisional; playtest queueing, repetitive defence, match length and Guardian response time on physical phones. Journey progression is available on every map; it does not establish equal difficulty across maps.

`npm.cmd run test:maps` checks the original Crossroads flow and all four additions in Edge: direct dragging, a real Guardian worker reply, undo/reload, complete local games, map choice containment, and separate touch targets in Standard/Focus at 320×568, 390×844, 761×752, 844×390 and 1366×768. General appearance, journey, audio and puzzle suites cover regressions. Browser emulation does not replace Safari and physical-device testing.

Tutorial and offline installation have since been implemented; see [interactive help](INTERACTIVE-HELP.md) and [offline installation](OFFLINE-INSTALLATION.md). New map-specific puzzle packs, deployment of the latest changes and competitive balance calibration remain follow-ups.
