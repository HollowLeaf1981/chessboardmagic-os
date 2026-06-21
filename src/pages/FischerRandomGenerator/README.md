# Fischer Random Generator

Browse and look up Chess960 starting positions by index or at random.

## Overview

A viewer/lookup tool for all 960 Chess960 starting positions. The user can either roll a random position with the Generate button or jump to a specific position number (0–959) via a numeric input. The chosen position renders on a non-interactive `react-chessboard` (dragging disabled, since this is a viewer rather than a playable board), with the corresponding FEN string shown beneath in a read-only input alongside a copy-to-clipboard button. The position-number input keeps its value as a string to allow free typing, with a blur handler that normalises invalid or out-of-range input back to `0`.

## Data

- `@/data/fischerrandom` — pre-generated array of all 960 starting positions as FEN strings, indexed 0–959 to match the standard Chess960 / SP numbering scheme.
