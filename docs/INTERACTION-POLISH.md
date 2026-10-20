# Play hierarchy and interaction polish

This pass applies the supplied video transcripts' emphasis on clear feedback, consistent actions, product identity and recoverable states. It keeps the cream/forest/coral palette and board motifs, rather than adding a new visual skin.

Home stays anchored below the header. On phones and short landscape screens, the bottom action bar replaces the footer and occupies its own grid row, with safe-area padding. It does not cover the scrolling setup area. A fresh match gives Play the sole strong action colour; an unfinished regular match promotes Continue, while New match stays secondary and retains replacement confirmation after moves. A finished match offers quiet Review alongside the next Play action. The context line distinguishes the saved match from currently selected setup choices.

In Puzzles, the main action resumes an unfinished attempt in the selected pack or starts its first unsolved puzzle. Completed packs replay from the first puzzle. Saved attempts from another pack remain available as secondary actions, and normal-match saves remain separate. Resizing moves the same buttons between desktop positions and the mobile action bar; IDs, handlers and saves are not duplicated. Rival/map/mode selections use quieter backgrounds.

Home uses short mode explanations and explicit rival, board and difficulty labels. Mobile rivals are compact rows with the selected rival's summary and an SVG info button inside its card. Locked rivals remain unavailable for play; their separate lock buttons open the requirement without changing the selection. Details show the selected board's records, while Free play explains that Journey records are unaffected. Desktop retains the fuller profile.

Board and puzzle-pack choices include decorative silhouettes drawn from each map's actual edges and nodes. Names remain visible, controls retain 44px touch targets, and Difficulty uses native radios with visible circles and keyboard focus. The puzzle-pack label and solved count share one row; the selected map button supplies the pack name. Only the puzzle list scrolls, leaving mode and pack controls visible above the anchored Play action. Landscape places rivals/settings or pack/list in separate columns.

The mobile header adds 10px of breathing room beyond its previous safe-area spacing. The sticky mode chooser paints an opaque background into the surrounding gutters using shadows, which do not enlarge its scrollable width. Secondary mobile actions use a 58/42 split (60/40 on the narrowest screens) to accommodate longer rival names. Horizontal overflow checks cover both match setup and puzzle views.

Selected pawns lift subtly and expose the actual connected legal paths. Legal destinations combine a dashed ring and centre dot. Invalid taps/drops give visible feedback and preserve the turn, including with sound disabled. Reduced motion retains feedback without the lift or extra finish pause.

Focus and short landscape views use a temporary notice when their normal instruction text is hidden. A pawn with no open connections explains that another pawn should be chosen. The primary action also comes first in the action bar's keyboard order.

After the final animated delivery, the completed board and score remain visible for 550ms before results. This delay applies only to a newly played finish, not a restored result; new matches and Home cancel it. Results have one prominent action: next rival/puzzle where available, otherwise retry/rematch. Saving messages in Pause, results and the board reflect actual save availability. Unsupported/newer backups provide a recovery instruction and leave current data unchanged.

`npm.cmd run test:hierarchy` covers primary actions, saved/setup separation, puzzle pack/resume decisions, responsive reparenting, silent invalid-move feedback, final-delivery reveal, and simulated save failure. The appearance and mode suites cover the layouts with saved games; existing progression, puzzle, drag, production and offline suites remain applicable. Real iPhone testing is still needed for safe areas and physical touch feel.

## State review

| State                        | Feedback and next action                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| First visit                  | Selected rival/map are visible; Play is prominent, with Help in the header.                   |
| Returning with a match       | Continue names the saved match; changing setup does not replace it.                           |
| Finished match               | Quiet Review plus a new Play action; results prioritise the next challenge or retry.          |
| Puzzle pack                  | Resume its attempt or start the next unsolved puzzle; another pack's save remains accessible. |
| Invalid move or blocked pawn | Visible explanation, legal connections where available and no consumed turn.                  |
| Automatic pass               | Existing pass notice explains which player moves again.                                       |
| Saving unavailable           | Pause and board ask the player to keep the tab open; no false saved confirmation.             |
| Offline preparation/update   | Existing Settings readiness/retry and Home-only update flow remain available.                 |
| Failed/newer backup          | Readable recovery instructions; validation happens before replacing any data.                 |
