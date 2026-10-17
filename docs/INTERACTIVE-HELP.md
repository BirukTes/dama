# Interactive help

Enter through **How to play → Try guided lesson**, or **Pause → Rules** during a match. After completion the entry reads **Replay guided lesson**. It remains optional and never auto-opens.

Six independent Classic teaching positions cover:

1. Drag or tap the top-right Blue pawn one connection to top middle.
2. Stop at the centre rather than jumping across two connections.
3. Deliver to the left edge, remove the pawn and increase Blue's score from one to two.
4. Move backwards towards the right, with a reminder about repetition draws.
5. Move into the centre to block all Coral exits. The actual rules pass Coral and leave Blue to move again. Feedback explains mutual blocking and the 100-turn cap.
6. Deliver the third pawn and produce a real Blue win.

Every position and guided move is validated by the production rules. The controller accepts only the specified teaching move, highlights its source/destination and gives feedback on wrong attempts. Next requires completing the move. Back and Reset restore an exercise; Exit is always available. Exercises use separate state rather than advancing a full opponent match. Feedback explains that Coral normally moves next.

The modal uses the same drag handling and pawn visuals as the game, with its own node attribute. It supports immediate press-and-slide, invalid-drop return, tap-to-select, keyboard arrows, Enter/Space and Escape. A fresh press or keyboard activation after dragging is treated as intentional; only the generated drag-release click is suppressed. Screen-reader instructions, labelled nodes, live feedback and focus on Next accompany each step.

Main-game and puzzle saves are never swapped or written by the tutorial. No results enter Journey statistics. Opening pauses the computer. Starting from Pause returns to Pause on exit, including Escape; resuming is explicit. Completion stores only the optional `dama-tutorial-v1` marker. Reopening starts from the first exercise, and interrupted lessons leave the match intact. Storage failures do not prevent learning.

Unit checks validate all six states/moves, immutability, delivery, retreat, the genuine automatic pass and final win. `npm.cmd run test:tutorial` covers the entire flow in Edge, wrong moves, drag/keyboard, Back/Reset, completion/replay, paused AI, match/puzzle isolation and phone/landscape layouts. Set `DAMA_TEST_URL=http://localhost:4173` to run against the production preview. Physical Safari testing remains useful.
