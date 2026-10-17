# Puzzles and rival tuning

Implemented on 17 October 2026, following the committed immersive board, direct dragging, rival journey, Home lobby, and sound fixes. The tutorial and offline installation remain the next phase, in that order.

## Six authored challenges

| Puzzle               | Blue move limit | Lesson                                                       |
| -------------------- | --------------- | ------------------------------------------------------------ |
| One last step        | 1               | Recognise a direct edge delivery                             |
| A stop along the way | 2               | The centre is a stop; retain alternate exits                 |
| The right order      | 2               | Deliver the less flexible pawn first                         |
| Keep a route open    | 3               | Establish access before racing                               |
| Between the guards   | 4               | Use the free middle exit, then respond to the guards         |
| The comeback         | 4               | Control the centre before taking an easy point from 0–2 down |

Blue must deliver every remaining pawn within the stated number of Blue moves. Coral replies do not spend that budget. The original board graph, goals, passes, repetition and turn cap are unchanged. All puzzles are available without unlocking, payment or an account.

Verification enumerates the baseline reachable graph and checks every authored position belongs to it. An exact bounded AND/OR search proves a Blue choice exists that succeeds against every legal Coral reply. The solver includes draw history and remaining move budget in its memo key. Each stated limit is minimal: the position cannot be guaranteed in one fewer Blue move. Tests traverse the solution tree across every defensive reply and check legal state invariants. Wrong legal moves exist in each puzzle; the defence can exploit a missed route rather than following a cooperative script.

The defender chooses a reply that refutes the budget when possible, otherwise the reply requiring the most remaining Blue moves. It runs in the existing worker. Hints use the same exact solver and report when a guaranteed route is no longer available. Explanations describe the opening idea; subsequent moves can depend on Coral's reply.

## Saves and completion

- Regular matches retain `dama-session-v1`.
- Active puzzle attempts use `dama-puzzle-session-v1`, including undo snapshots and hint usage. Selecting the same unfinished puzzle resumes it; Retry starts fresh.
- `dama-puzzles-v1` records best move counts and whether each puzzle has ever been solved without hints. Repeated render/reload does not add completions.
- Returning Home restores the regular match without replacing it. Puzzle results are excluded from rival wins, losses, draws and unlocks.
- All storage is local to this origin/browser. Storage failure leaves play available; clearing browser data removes saves and progress.

## Rival changes

Immediate wins and avoidance of an immediate losing response run before Gentle's random choice. Gentle still makes occasional safe random moves (25%) and searches two plies. Standard searches up to three plies for Coral, four for Runner and six for Guardian.

Search uses iterative deepening with a shared 24,000-node decision budget. Only a completed depth replaces the previous result, preventing partially searched root options from biasing the move. Graph distances are precomputed. Delivery moves are searched first to improve pruning. Equal-valued choices can vary; a small penalty discourages revisiting a position when it is nonterminal and viable. Terminal draws and forced wins/losses retain their result values.

Guardian's former evaluation multiplied the opponent's entire score by 1.35. That made an even delivery score look unattractive and encouraged settling for a draw. Deliveries are now valued symmetrically, with higher mobility weighting and a small centre-control preference preserving the defensive identity.

## Controlled comparison

Run `npm.cmd run analyze:rivals` to reproduce the current sample. It uses a frozen pre-tuning three-ply Coral reference for Blue, with 20% seeded random legal moves to introduce mistakes and different positions. Each rival plays 24 games, alternating starters, with seeds 1729–1752. The frozen reference was cross-checked against the previous implementation over all 2,044 baseline positions, with identical chosen moves.

| Rival    | Before W / L / D | After W / L / D | After mean turns | After p95 decision time on development PC |
| -------- | ---------------- | --------------- | ---------------- | ----------------------------------------- |
| Coral    | 18 / 6 / 0       | 14 / 10 / 0     | 14.4             | about 2 ms                                |
| Runner   | 15 / 0 / 9       | 12 / 2 / 10     | 20.9             | about 7 ms                                |
| Guardian | 0 / 0 / 24       | 24 / 0 / 0      | 22.0             | about 54 ms                               |

This sample demonstrates Guardian's draw-seeking problem and a more forgiving Coral, while Runner remains more resistant to defeat than Coral. It does not establish human difficulty rankings, prove optimal play, or show that every rival became stronger. Randomness is seeded for reproducibility; timings depend on hardware. Phone performance, perceived variety, and human draw frequency still need playtesting. Under perfect baseline play the initial board remains a draw, so removing every draw is neither possible nor desirable without changing rules.

## Validation and release

Unit tests verify tactical safety, variation among equivalent winning moves, legal replies, puzzle reachability, exact solution budgets, failed goals, separate saves, hint-assisted completion, and rival-stat exclusion. Browser tests solve all six against the real defence worker, exercise failure/retry, hint dialogs, save/resume/reload, and viewport fit in Standard and Focus views. The production smoke test exercises the bundled puzzle worker and preservation of a regular match.

Changes are committed locally for review. Push/deployment, the tutorial and offline installation are separate actions; this update does not add a service worker or claim offline support.
