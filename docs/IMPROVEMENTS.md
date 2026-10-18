# Solo improvements

Agreed sequence: fair Journey, backup/restore, clearer progression, map puzzle packs, optional achievements, difficulty/accessibility polish. Online multiplayer and daily puzzles are later work.

- Phase 1: Journey has no undo, including restored legacy Journey saves. Free play and puzzles retain undo. Existing unlocks are preserved.
- Phase 2 implemented: [Versioned JSON backup](BACKUPS.md), strict validation, restore preview and explicit replacement with rollback on write failure. Download/import/cancel/reload and failed-write recovery have automated coverage.
- Phase 3 implemented: Home names the next unbeaten rival/map. Results offer retry/rematch and a Free play practice shortcut. Completed maps lead to the next unfinished map; completing all 18 rivals ends that sequence. Unit and browser progression checks cover goals, independent unlocks and practice navigation.
- Phase 4: Verified packs for alternative boards with independent saved completion.
- Phase 5: Optional achievements derived from existing records, with no required grind or extra unlock gates.
- Phase 6: Explain challenge settings, improve keyboard/dialog handling and evaluate bounded AI across maps. Physical-device and human difficulty checks must remain explicit.

Implementation and validation details will be updated as each phase is completed.
