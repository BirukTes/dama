# Game structure

Home has two explicit play choices, Journey and Free play, with Puzzles as a separate entry. A player chooses a map and rival, then starts directly. There is no additional start screen.

## Journey

All six maps are available immediately. Each starts with Coral unlocked. Beating Coral unlocks the Runner on that map; beating the Runner unlocks Guardian. Beating Guardian completes that map's journey. Either Gentle or Standard counts. Wins, losses and draws are stored per rival and per map on this browser. Map choices show rivals beaten out of three. Unlocked rivals remain replayable.

Results offer the next rival on the same map. Guardian wins offer the first unfinished map in catalogue order, selecting its next unbeaten available rival. If all journeys are complete, rematch and Home remain available. Journey supports the existing undo feature; this is personal progression, not a competitive ranking.

## Free play

Every map and rival is available immediately, including on Classic. Play the computer with either challenge setting or choose a friend on the same device. The friend shortcut on Home selects Free play. Results never affect Journey records or unlocks.

The match retains its Journey/Free play identity through undo, reload, resume and rematches, even if Home's mode selector has changed. Home choices apply to new matches. Replacing a match with moves still requires confirmation.

## Puzzles

The existing six challenges form **Classic · First steps**, ordered from one to four Blue moves. They retain their exact bounded defence, independent completion records, hints and separate saved attempt. Playing a puzzle preserves the regular match and never unlocks Journey rivals. Other map packs are future authored content, not placeholder levels in this release.

## Save compatibility

Classic keeps `dama-progress-v1` unchanged. Other maps use `dama-progress-<map-id>-v1`, with the same validated win/loss/draw schema and result deduplication. A corrupt map's progress falls back to empty without replacing valid data for other maps.

New sessions persist `track: journey | free-play` alongside the existing solo/local control mode. Old Classic solo sessions with no track remain Journey. Old alternative-board sessions with no track remain untracked Free play, including rematches. This avoids crediting previously completed practice matches. Puzzles and local games cannot count toward Journey, regardless of their track field. Unsupported track values invalidate the session. No server account or network dependency is introduced.

## Validation

Unit checks cover independent map records, legacy Classic preservation, old alternative saves, wins/losses/draws, unlock order, deduplication, excluded modes and save validation. `npm.cmd run test:progression` exercises 18 real delivery/unlock flows, reloads, next-rival/map navigation, mode persistence and puzzle isolation in the browser. Existing map, appearance, journey, audio, puzzle and production suites remain applicable.

The next planned work is the guided tutorial, followed by offline installation and update handling. Map-specific puzzle packs and difficulty calibration need separate content/playtesting work.
