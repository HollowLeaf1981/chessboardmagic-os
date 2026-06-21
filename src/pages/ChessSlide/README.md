# Chess Slide

15-puzzle variant where each tile is a 2×2 chunk of a chess board. Slide tiles to reconstruct the position from a named opening.

## Overview

Each round picks a random 12-move opening from the ECO dataset, plays it through `chess.js` to get the resulting FEN, then parses that FEN into an 8×8 array of piece codes (`wP`, `bN`, etc.) keyed to match the asset filenames. The board is sliced into a 4×4 grid of tiles where each tile holds a 2×2 area of squares — sixteen tiles in total, matching the classic 15-puzzle layout. One tile is removed at random to create the empty slot, then the whole grid is shuffled via a flatten/Fisher-Yates/rebuild pass.

Each tile renders four quadrants in a 2×2 sub-grid, with light/dark square colouring matching a standard chessboard pattern. Hovering a quadrant shows the algebraic square name (e.g. `C5`) via a tooltip — that mapping comes from a small `TILE_ANCHORS` lookup table that records each tile id's top-left square, with quadrant offsets added at lookup time. Empty squares render as a 1×1 transparent GIF placeholder so the grid stays uniform whether or not a piece is present.

Clicking a tile that's orthogonally adjacent to the empty slot swaps them — the slide. The Check button counts how many tiles have their `id` matching the slot they occupy; 15 or more counts as a win (the empty slot can't be checked the same way), at which point the empty tile fills in visually and the status line reports completion. Otherwise the status line reports the partial count so the player knows how close they are.

A `ResizeObserver` watches the left column so tile size scales with the viewport — important since the puzzle has to remain readable on mobile but should fill the available space on larger screens.

## Data

- `@/data/eco` — source of opening entries, filtered to `length === 12` (twelve characters of PGN) so each round has a comparable target length. The `name` is shown as the goal; the `pgn` is played through `chess.js` to derive the target FEN.

## Assets

- `/img/chesspieces/wikipedia/{piece}.png` — the Wikipedia piece set. Piece codes are two characters (`wP`, `bN`, etc.) with colour lowercase and type uppercase, matching the FEN re-encoding done in `parseFen`.
