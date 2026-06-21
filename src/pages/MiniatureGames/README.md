# Miniature Games

Replay short, decisive chess games.

## Overview

Miniature Games lets you explore a collection of short chess games on an interactive board. A random game is selected when the page loads, but you can choose a specific game from the dropdown or use the shuffle button to jump to another one.

Each game shows basic context such as the site, date, and a short description. The moves are loaded into the shared `GameViewer` component, where you can step through the game using the board controls, the left/right arrow keys, or by clicking directly on the notation.

The board is non-draggable because this is a replay tool, not a play interface. Player cards are shown above and below the board, and if a player image is missing, the viewer falls back to a simple letter avatar.

## Data

The games are stored locally in `@/data/historicgames/miniatureGames`.

Each entry contains the game metadata and move text needed to replay the game:

- **`Name`** — the display name of the game.
- **`Description`** — short context for the game.
- **`Site`** — where the game was played.
- **`Date`** — when the game was played.
- **`White`** — the player with the white pieces.
- **`Black`** — the player with the black pieces.
- **`Result`** — the game result.
- **`Moves`** — the move text used for playback.

Some entries may also include ratings, round information, or ply count where available.
