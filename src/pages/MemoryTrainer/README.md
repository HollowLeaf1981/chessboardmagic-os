# Memory Trainer

Spatial-memory drill — memorise a real middlegame position, then reconstruct it from memory.

## Overview

Each round picks a random entry from the local `usergames` dataset. The app loads the PGN with `chess.js`, replays the game move by move, and stops at the first position that matches the selected piece count. This gives the player a real game position rather than a randomly-generated board.

The position is shown for a memorisation countdown between 5 and 60 seconds. When the countdown ends, the board is cleared and the player has to rebuild the position from memory using the spare-piece picker.

The player can place pieces by selecting a spare piece and clicking a square, or by dragging a spare piece onto the board. Pieces already on the board can be moved by dragging them. The Clear button removes the attempted position, while Quit reveals the target position again.

Clicking Check compares the rebuilt position against the target. Correctly placed pieces are highlighted green, incorrectly placed pieces are highlighted red, and missing pieces still count against the result even though there is no square to highlight. The round only succeeds when every target square contains the correct piece.

## Data

The app uses `@/data/usergames`, a local static dataset derived from PGN games.

For this trainer, the important field is:

- `P` — PGN move text. The app replays this with `chess.js` and extracts a position when the board has the selected number of pieces.

Other fields may exist in the shared dataset for other applications, but Memory Trainer only needs the PGN moves.
