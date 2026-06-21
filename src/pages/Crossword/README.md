# Crossword

Chess-themed crossword. Words are drawn from the chess terms dataset and interlocked into a single connected grid, with hints derived from each word's description.

## Overview

Each round picks 20 words from the chess terms dataset across three size buckets (3 large of 10–12 letters, 5 medium of 6–9, and 12 small of 4–6) and runs them through a backtracking crossword generator. The generator places the longest word horizontally at the origin, then for each subsequent word it scans the grid for matching letters and tries every position where the new word could cross an existing one without conflicts. If it can't fit a word, it backtracks. Once a valid layout is found, the words are renumbered top-left to bottom-right (across-then-down) to match standard crossword convention.

Hints come from each word's `Description` field with the term itself blanked out by underscores — case-insensitive, so "Sicilian" and "sicilian" both get replaced. The hint is also truncated to the first two sentences while the game is in progress so it doesn't drone on. Once the player solves or quits, the full descriptions are revealed, letting the puzzle double as a chess vocabulary primer.

The grid renders as a series of 40px square cells; non-grid cells have no border and read as gaps in the silhouette. Each word's first letter shows its custom number in the top-left corner of the cell so the hints can reference it. The Check button verifies every cell against the expected letter; failure flashes a 3-second alert, success shows a permanent green banner. A two-step Quit (Quit → Confirm/Cancel) auto-fills the answers so the player can see the solution without claiming a win.

## Generator

The crossword generator (`crosswordGenerator.ts`, in the same folder) is a greedy backtracking placer:

1. Sort words ascending by length and pop the longest as the seed (placed horizontally at the origin).
2. For the next word, build a letter map of every placed letter. For each occurrence of a letter that exists in the new word, try placing the new word so that letter crosses there. Validate that the placement doesn't overlap, touch, or sit adjacent to any other placed word.
3. Recurse with the next word from the sorted pool. If recursion fails, backtrack and try another candidate position. If all candidates fail, return false to the caller.
4. When the pool is empty, normalise the coordinates back to a (0, 0) origin and return the final grid dimensions + word placements.

It's not guaranteed to succeed on every input, but the size-bucketed selection above gives it enough room that failures are rare.

## Data

- `@/data/chessterms` — source of words and hints. The `Key` field is the uppercase letters placed in the grid, `Term` is the natural-language name (used for the underscore replacement), `Description` is the source of hints, and `Length` is used to bucket words by size.
