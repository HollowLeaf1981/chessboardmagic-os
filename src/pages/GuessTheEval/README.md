# Guess The Eval

Classify a chess position into one of five verdicts and find out how close you were to the engine's true evaluation.

## Overview

Each round draws a random position from an evaluations dataset and asks the player to pick between five verdicts: White is winning, White is better, Position is equal, Black is better, or Black is winning. The thresholds in `getEvalDescription` map the raw centipawn score into those five buckets (±0.5 for equal, ±2.0 for winning) and the player's choice is compared against that canonical verdict. Mate scores (`M5`, `M-3`) are handled specially so a "winning" guess matches a forced mate for the correct side.

Positions are filtered to ensure at least ten pieces have moved off their home squares, which keeps the puzzle in middlegame territory and away from openings where the eval would be too close to zero to be interesting. The board orients itself to the side to move so the player always looks at the position from the moving side's perspective. After the guess, the result block reveals the true evaluation, the first eight follow-up moves as a clickable list (each click steps the board forward to that move; "Reset" rewinds to the starting position), and a copy-to-clipboard FEN box for pasting into an engine or analysis board.

## Data

- `@/data/evaluations` — source of puzzle positions, each entry providing a `FEN`, a space-separated `MOVES` string (UCI-style, with castling encoded as king-rook pairs like `e1h1` rather than `e1g1`), and an `EVAL` value that's either a centipawn integer or a mate string.
