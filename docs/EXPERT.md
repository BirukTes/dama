# Expert difficulty

Gentle, Standard and Expert are AI strength settings, separate from rival style and movement rules. Standard remains the default. Every difficulty counts toward Journey progression. Puzzles continue to use the exact defender, independently of the Home setting. Choosing Expert never enables One Retreat.

Gentle retains its two-ply search and occasional tactically safe random choice. Standard retains Coral/Runner/Guardian search depths of 3/4/6 and a 24,000-node budget. Expert allows every rival to search up to eight individual moves, with a 96,000-node budget. Rival evaluation weights, immediate-win checks, immediate-loss avoidance and repetition handling remain shared. Expert has no deliberate random lapse, although equally evaluated moves can vary.

Iterative deepening accepts only complete depths. A partially searched depth never biases the decision toward an early move. Search remains in the existing cancellable worker; Home and modal menus stop it. The larger budget is bounded, not an unlimited search or a promise of optimal play. Physical-phone latency and perceived difficulty still need playtesting.

Existing Gentle/Standard sessions are unchanged. Expert sessions, Home preferences and backups validate and restore the new value. Resume and rematch retain the actual difficulty; changing Home does not change an ongoing match. Classic and One Retreat each retain their own independent choice.

## Evidence and reproducibility

`npm.cmd run analyze:expert` compares Standard and Expert decisions after a reproducible first move on all nine boards, for each rival and both movement rules. It writes `.inspection/expert-benchmark.json` with node counts, completed depths, decisions and PC timings. In the initial 54-decision sample per setting, Standard completed depths 3–6 (median 3ms, maximum 132ms); Expert completed depths 7–8 (median 310ms, maximum 1,212ms). These desktop measurements are not iPhone latency estimates or a win-rate benchmark.

Exact-solver regression tests check that Expert preserves the guaranteed finish within the authored budget in **Between the guards** and **The comeback**, where Standard Coral's selected move cannot guarantee that budget. This demonstrates deeper tactical planning in those positions; it does not establish dominance over Standard on every board or prove fewer draws. All-board tests check legal moves, unchanged input states and the bounded search under both movement rules.

`npm.cmd run test:expert` exercises keyboard selection, remembered preference, unchanged Journey movement, real Expert worker replies on all nine maps, both movement rules, reload, puzzle-save isolation and five screen layouts. Offline tests also resume an Expert One Retreat match.
