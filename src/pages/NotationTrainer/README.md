# Notation Trainer

Practise reading and writing chess notation by typing the moves of historic games.

## Overview

Notation Trainer is an interactive trainer for standard algebraic notation (SAN). The player picks a game from the built-in collections or loads a random one, and then types each move of the game as it is played out on the board.

The board starts on the position after the first move, with an arrow showing what was just played. The player types the SAN for that move and submits it. A correct guess advances the board to the next move; a wrong guess can be retried, and after three wrong attempts the answer is revealed and the game moves on. Wrong guesses are tracked per move so they can be highlighted during review.

Strict mode controls whether check and checkmate symbols (`+` and `#`) must be typed exactly. With strict mode off, those symbols are ignored when comparing the player's input to the expected move. Castling can be entered with either letters or zeros (`O-O` or `0-0`).

Once the game is finished, or the player ends it early, the trainer switches to review mode. The full move list is shown alongside a navigable board, with each move clickable and the arrow keys stepping forwards and backwards through the game. Moves the player got right are shown normally, moves revealed after three wrong attempts are shown in red, and moves never reached are dimmed.

## Data

Games are loaded from local PGN collections bundled with the app, including World Championship games, classic games, and famous miniatures. Opening names are matched against a local ECO dataset and shown next to the board when the played moves match a known opening. Per-game progress (which games have been played and when) is persisted in local storage.
