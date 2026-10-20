# Diamond, Weave, Switchyard and One Retreat

## Integration plan and delivered behaviour

1. Promote the three prototype graphs into the shared map registry. Preserve the six original IDs, catalogue order, starts, goals and saved progress. Add the new boards after Islands, with the same rendering, drag, keyboard, worker, delivery and focus-view paths as existing boards.
2. Give each new map its own Coral → Runner → Guardian Journey and three-puzzle pack. Preserve all existing puzzle IDs. Discover legal endgame positions by replayable games and prove their one-, two- and three-move budgets against every defensive reply.
3. Add an optional, remembered Free play movement choice for solo and same-device games. Default to Classic; keep Journey, tutorials and puzzles unrestricted. Apply the choice only when starting a match, and preserve its actual rule through resume, rematch, backup and undo.
4. Verify nine-map layouts, both starting sides, rival legality, per-map progression, exact puzzle solutions, old saves, restricted saves and offline workers before deployment.

## Graphs and content

| Board      | Spots | Connections | Added choices                                                                                        |
| ---------- | ----: | ----------: | ---------------------------------------------------------------------------------------------------- |
| Diamond    |     9 |          20 | Classic plus four connections between its outer middle spots. Unmarked line crossings are not stops. |
| Weave      |    12 |          23 | Four columns, three lanes, with six alternating diagonal connections.                                |
| Switchyard |    11 |          22 | Two middle junctions connect the upper and lower approaches, with a link between them.               |

All boards use three pawns and opposite-bank delivery. There are now nine Journey tracks (27 rival milestones), nine puzzle packs (30 puzzles) and 22 optional goals derived from existing records. Added content expands the all-maps/all-puzzles goals; individual older records are unchanged. These graphs are playable and support wins by either colour, but that does not establish equal difficulty or fewer draws under experienced play.

## Movement and save compatibility

One Retreat means one backward move per side for the whole match, shared across its pawns. Blue moving right or Coral moving left spends the allowance; diagonal moves use their horizontal direction. Vertical moves remain unlimited. Each side's remaining allowance is visible with the score and described in accessible text. Pause and help identify the rule. All rivals search with the same filtered legal moves; the heuristic remains provisional.

Only limited states carry `retreats: { blue: 0 | 1, coral: 0 | 1 }`. Unlimited states and their historical keys retain their old form. Limited repetition keys include both counters, so the same pawn placement with a different remaining resource is a different position. Moves clone the counters, undo restores them, rematch resets them, and reload retains them. Session validation rejects limited Journey/puzzle saves and mixed-rule undo stacks. Restricted matches never award Journey progress. Backups include the movement preference, restricted states and new per-map records.

The local `/lab.html` comparison page remains development-only. It shares production geometry while retaining its independent bounded opponent and extra-route switches.

## Verification

Unit tests replay all new reachability witnesses, prove minimal puzzle budgets, traverse every legal defensive branch, validate both colours' delivery goals, test all rivals' restricted moves, and check save/backup compatibility and progression isolation. Browser suites exercise all 27 unlock results, the 24 alternative-board puzzles through the real defender, the new maps' complete games and touch targets, and restricted AI/undo/reload/rematch behaviour. Offline tests include every map's bundled worker and a restricted Weave match resumed without network access.

Human follow-up: play both starting sides on physical iPhone/Android devices, compare draw frequency with movement unrestricted versus limited, and assess fairness and rival response time. No claim of competitive balance or a reduction in draws is made by the automated tests.
