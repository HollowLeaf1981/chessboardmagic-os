# Wordsearch

Find hidden chess terms in a 20×20 grid of random letters.

## Overview

Each round picks ten target words from the chess terms dataset — four small (≤5 letters), five medium (≤10 letters), and one large (<20 letters) — so the player gets a consistent mix of easy and hard targets per puzzle. Words are placed in eight possible directions (horizontal both ways, vertical both ways, and the four diagonals) with up to 50 random placement attempts per word; remaining cells are filled with random A–Z noise so target words blend in. Players drag across a straight line to highlight a candidate (mouse on desktop, finger on touch devices), and on release the dragged letters are compared against the target word list. Matching words lock into a colour band (ten distinct colours cycle via `found % 10`) and the dataset's `Term`, `Type`, and `Description` populate the side panel.

The found-state is shared between the grid cell and the word-list entry via a `foundWordCounter` that increments on every find, so each word and its grid cells share the same colour band. A Reset button clears all found-state but keeps the same grid and word list, letting the player re-attempt the same puzzle; Play generates an entirely new round.

## Touch support

The grid handles both mouse and touch input. Touch events fire on the element where the touch _started_ rather than the element currently under the finger, so `touchmove` uses `document.elementFromPoint` to look up which cell the finger is over and feeds that into the same handler the mouse uses — all the geometry, word-matching, and highlighting logic is shared. Cells set `touch-action: none` so the browser doesn't interpret the drag as a scroll or zoom gesture.

Cell size is clamped to a minimum (~26px) so taps stay reliable and `elementFromPoint` lands cleanly on the intended cell. When the viewport is narrower than the clamped grid width (≈520px), the wrapper scrolls horizontally instead of shrinking cells further.

## Styling

This component ships with a sibling `WordSearch.css` file for two reasons:

- **Found-state colour bands** — ten `.found-0` through `.found-9` classes with distinct pastel backgrounds. The found counter mod 10 picks which class applies, so each found word visually distinguishes itself from its neighbours.
- **Drag-selection styling** — `.selected` (in-progress drag highlight), `.cell` (disables text selection so the drag doesn't fight the browser's text-selection behaviour), and `.strikethrough` (for the word list). Cell borders and table layout are also defined here since the grid uses an actual `<table>` for predictable row/cell alignment.

## Data

- `@/data/chessterms` — source of target words. Entries are filtered by `Length <= boardSize` and bucketed by size. The `Key` field is the uppercase letters placed in the grid; `Term`, `Type`, and `Description` populate the side panel when a word is found. The `Type` field maps to a display label via `getWordType` (`O` → Chess Opening, `P`/`W` → Chess Player, `E` → Chess Engine, anything else → Chess Term).
