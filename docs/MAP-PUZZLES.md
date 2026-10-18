# Map puzzle packs

Puzzles now has six map tabs: Classic keeps its six original challenges; Crossroads, Ring Road, Twin Bridges, Long Crossing and Islands each add three introductory endgames. There are 21 puzzles total. Each alternative pack progresses from one to three Blue moves. These are short introductions to the map's connections, delivery routes and move order, not expert difficulty claims.

The picker uses independent native radios and remembers its selected pack. Previews draw the actual graph and pawn coordinates, including rectangular boards and Islands. A saved puzzle can be resumed from any pack; starting it selects the correct pack. Next puzzle stays within its pack. Regular matches and Journey unlocks remain separate. Existing puzzle IDs and completion records are preserved, and backups include the pack preference and all new records.

`src/game/map-puzzles.ts` contains the positions and authored titles. Candidate endgames were discovered by seeded legal games, then checked with the exact bounded solver. `tests/map-puzzle-witnesses.ts` records the full legal move sequence from each map's starting position. Tests replay every sequence, validate each position, prove the stated minimal move budget, follow a winning strategy against every Coral response, and check that a wrong opening can be punished.

`npm.cmd run test:packs` solves all 15 new puzzles through the browser and actual defence worker, checking map saves, completion, regular-match isolation and layouts. The existing Classic and mode suites cover the original pack, hints, retries and short-screen layouts with a saved attempt. Physical phone playtesting still matters for difficulty and touch comfort.
