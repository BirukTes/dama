# Game structure

Home has three equally prominent mode tabs: **Journey · Puzzles · Free play**. A player chooses a map and rival, then starts directly. There is no additional start screen. Journey and Free play show map, challenge and rival choices. Puzzles replaces those match settings with its challenge pack directly on Home, rather than opening a picker modal.

## Journey

All nine maps are available immediately. Each starts with Coral unlocked. Beating Coral unlocks the Runner on that map; beating the Runner unlocks Guardian. Beating Guardian completes that map's journey. Gentle, Standard and Expert all count. Difficulty changes AI strength without changing movement rules. Wins, losses and draws are stored per rival and per map on this browser. Map choices show rivals beaten out of three. Unlocked rivals remain replayable.

Results offer the next rival on the same map. Guardian wins offer the first unfinished map in catalogue order, selecting its next unbeaten available rival. If all journeys are complete, rematch and Home remain available. Journey does not allow undo, including restored legacy Classic Journey saves. Free play and puzzles retain undo while playing. Existing unlocks are kept.

## Free play

Every map and rival is available immediately, including on Classic. Play the computer with any difficulty or choose a friend on the same device. The friend shortcut on Home selects Free play. Results never affect Journey records or unlocks.

Movement defaults to Classic, with unlimited backward moves. One Retreat is optional and gives each side one backward move for the entire match, shared by its three pawns; vertical moves are unrestricted. The preference is remembered and applied only at match creation. Visible counters, rules, saves, undo and rematches retain the actual rule. Journey and puzzles always use Classic movement. See [the integration notes](EXPANDED-BOARDS.md).

The match retains its Journey/Free play identity through undo, reload, resume and rematches, even if Home's mode selector has changed. Home choices apply to new matches. Replacing a match with moves still requires confirmation.

## Puzzles

The Puzzles tab offers nine map packs: the original six Classic challenges and three introductory endgames for each alternative map, for 30 puzzles total. They retain exact bounded defence, independent completion records, hints and a separate saved attempt. Playing a puzzle preserves the regular match and never unlocks Journey rivals. Next puzzle stays within the selected pack. See [map puzzle validation](MAP-PUZZLES.md).

Home remembers the selected tab, including Puzzles. Switching tabs does not alter an ongoing game. The regular match action explicitly says Continue/Review Journey, Free play or Friend match, with its board below and opponent in its accessible label. The Puzzles panel separately resumes its saved attempt. All three tabs support native radio keyboard navigation.

## Save compatibility

Classic keeps `dama-progress-v1` unchanged. Other maps use `dama-progress-<map-id>-v1`, with the same validated win/loss/draw schema and result deduplication. A corrupt map's progress falls back to empty without replacing valid data for other maps.

New sessions persist `track: journey | free-play` alongside the existing solo/local control mode. Old Classic solo sessions with no track remain Journey. Old alternative-board sessions with no track remain untracked Free play, including rematches. This avoids crediting previously completed practice matches. Puzzles and local games cannot count toward Journey, regardless of their track field. Unsupported track values invalidate the session. No server account or network dependency is introduced.

## Validation

Unit checks cover independent map records, legacy Classic preservation, old alternative saves, wins/losses/draws, unlock order, deduplication, excluded modes and save validation. `npm.cmd run test:progression` exercises 27 real delivery/unlock flows, reloads, next-rival/map navigation, mode persistence and puzzle isolation in the browser. `npm.cmd run test:modes` covers the three modes, saved match/puzzle isolation, keyboard selection, tab persistence and five screen sizes with and without a saved puzzle. Existing map, appearance, journey, audio, puzzle and production suites remain applicable.

The guided tutorial is available through How to play; see [interactive help](INTERACTIVE-HELP.md). The production build supports [offline installation and safe updates](OFFLINE-INSTALLATION.md), [save backup/restore](BACKUPS.md), map puzzle packs and optional achievements. See [the six solo improvements](IMPROVEMENTS.md) and [difficulty/accessibility notes](SOLO-POLISH.md). Physical-device validation and human difficulty feedback remain necessary.
