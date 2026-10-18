# Solo improvements

Agreed sequence: fair Journey, backup/restore, clearer progression, map puzzle packs, optional achievements, difficulty/accessibility polish. Online multiplayer and daily puzzles are later work.

- Phase 1 implemented: Journey has no undo, including restored legacy Journey saves. Free play and puzzles retain undo. Existing unlocks are preserved.
- Phase 2 implemented: [Versioned JSON backup](BACKUPS.md), strict validation, restore preview and explicit replacement with rollback on write failure. Download/import/cancel/reload and failed-write recovery have automated coverage.
- Phase 3 implemented: Home names the next unbeaten rival/map. Results offer retry/rematch and a Free play practice shortcut. Completed maps lead to the next unfinished map; completing all 18 rivals ends that sequence. Unit and browser progression checks cover goals, independent unlocks and practice navigation.
- Phase 4 implemented: [All six map packs](MAP-PUZZLES.md), with six Classic and 15 new puzzles. Every new position has a legal reachability witness and a verified minimal solution against all defensive replies. Pack navigation, saved attempts and actual worker solutions have browser coverage.
- Phase 5 implemented: 16 optional achievements in Settings → Optional goals. First Journey win, six map journeys, six puzzle packs, one pack without hints, all journeys and all puzzles. Awards derive from existing records and backups; no extra unlock gates, streaks or separate achievement storage. Newly reached goals appear in results.
- Phase 6 implemented: [Difficulty and accessibility polish](SOLO-POLISH.md), with challenge explanations, roving board focus, Escape to clear/Pause, labelled dialogs, 44px pack controls, static-evaluation caching and a reproducible 72-game map benchmark. Human difficulty calibration and physical-device checks remain explicit follow-up validation.

All six implementation phases are delivered as separate local commits. Save compatibility and existing unlocks are retained. Online multiplayer, daily puzzles and physical-device testing remain outside this implementation.
