# Where Are My Pieces?

Reconstruct a real position from World Championship history using only the silhouettes of where the pieces stand.

## Overview

Each round picks a random match from the World Championship games dataset, then a random game from that match, then a random move number between 20 and `min(PlyCount/2, 50)`. The position at that move becomes the puzzle target — but the player only sees coloured circles on the squares that hold pieces (white circles for white pieces, dark circles for black). The player has to deduce _which_ piece sits on each marked square based on the game context, the side to play, and chess intuition.

The picker supports two interaction modes: click a piece in the picker then click a square to place it (click-to-place), or drag a piece directly onto a board square. Placed pieces can be dragged to another square to reposition or dragged off the board to remove. A dedicated Remove tool + Clear board button are also available for keyboard-free play.

Check verifies every square (not just placed ones): correctly-placed pieces get a green glow, mistakes get red, and unplaced squares that should hold pieces stay marked with the default circle. Quit reveals the answer position and transitions to the navigation phase. After completion (whether by solving or quitting), the player can step through the rest of the game with the prev/next/reset/last buttons or the left/right arrow keys, flip the board, and copy the full PGN to clipboard.

## Data

- `@/data/historicgames/worldChampionship` — a curated dataset of World Championship matches. Each match has `Event`, `Site`, and a list of `Games`; each game has `Date` (YYYY.MM.DD), `Round`, `White`, `Black`, `Result`, `Moves` (PGN), and `PlyCount`. Player names are stored "LastName, FirstName" and formatted for display via `convertNameFormat`.
