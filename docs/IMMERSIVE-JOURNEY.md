# Immersive play and rival journey

Implemented locally on 17 October 2026. The original nine-node graph and all movement, delivery, pass, and draw rules are preserved.

## Board and Focus view

Portrait uses a square board. Wide layouts use a 1.6:1 rectangle with circular pawns and independent horizontal/vertical animation coordinates. Landscape Focus removes the masthead and uses a compact sidebar for scores, turn status, Pause, and the view toggle. Safe-area insets remain in use.

Focus requests fullscreen from a user action. Touch devices also attempt a landscape orientation lock when the browser permits it. Rejection does not block play. A dismissible hint suggests rotating in portrait; small portrait layouts reserve room for it. Leaving Focus, leaving fullscreen, or returning Home releases any orientation lock acquired by the game. Browser support and real-device behaviour still require phone testing.

## Dragging

Press a pawn and slide with no prior selection or long press. Movement beyond six CSS pixels starts a drag. Legal destinations highlight, and a forgiving drop radius identifies the nearest valid node. A valid release settles the pawn and performs exactly one legal move. An invalid release returns the pawn without changing the turn. Reduced motion removes the return flight.

Pointer capture keeps a drag active beyond the pawn. Touch capture transfer, pointer cancellation, resize, window blur, document hiding, and opening menus clear the gesture. Synthetic clicks after dragging are suppressed. Stationary taps, tap-to-move, arrow navigation, Enter, and Escape remain available.

## Rivals and progress

| Rival        | Identity      | Standard behaviour                                                                     |
| ------------ | ------------- | -------------------------------------------------------------------------------------- |
| Coral        | Coral diamond | Shorter lookahead and balanced evaluation                                              |
| The Runner   | Amber chevron | Greater weight on deliveries, distance, and scoring threats                            |
| The Guardian | Violet guard  | Deeper lookahead, greater mobility weight, stronger penalty for opposing opportunities |

Gentle uses shorter lookahead and occasional random legal moves. Standard uses the rival's full profile. These are bounded heuristics, not solved or guaranteed difficulty rankings. Player feedback is still needed to assess variety and repetitive draws.

Only Coral starts unlocked. A solo victory on either setting unlocks the following rival. Home now serves as the match lobby: cards show identity, style, availability, and wins; the selected profile shows win/loss/draw totals. One Play button starts the selected rival, with no setup dialog or duplicate player selector. Rival choice and challenge setting are remembered locally. Local play also starts directly; starting either mode asks before replacing an unfinished match. Results offer the next rival after a victory, returning Home with that rival selected. Previously unlocked rivals remain replayable.

Progress uses `dama-progress-v1` in localStorage. Match IDs prevent duplicate result recording across render/reload. Session storage retains the existing version; optional rival and match-ID fields preserve older saves, which default to Coral. Local two-player matches do not change rival records. Progress is browser-local and can be lost by clearing browser data; blocked storage leaves play available.

## Validation

- Unit checks cover legality, immediate wins, differing rival decisions, ordered unlocks, local-match exclusion, duplicate results, legacy saves, corrupt data, and unavailable storage.
- Browser checks cover full games, saved reload, menus, keyboard play, themes, reduced motion, viewport fit, rectangular geometry, circular pawns, direct mouse/touch dragging, rejected drops, interrupted gestures, all rival workers, and unlocks across reload.
- The existing production smoke check runs against the locally built preview before handoff.

Physical iPhone and Android checks remain: finger placement and drop tolerance; portrait/landscape with browser chrome visible; notch and home indicator clearance; orientation lock/fullscreen fallback; leaving Focus; background/resume; light/dark colours and pawn symbols.

## Review and release

The update is committed as a rival logic/save foundation, the connected interface and controls, and these documentation notes. Unused styles from the original Home screen were removed before committing. Production deployment remains a separate step.

After review, commit and push to the connected GitHub repository to trigger Cloudflare Pages. Puzzles, tutorial, PWA installation/offline caching, accounts, monetisation, and new board rules are outside this update.
