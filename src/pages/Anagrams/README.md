# Anagrams

Drag scrambled letters back into a chess term, player name, engine, or opening.

## Overview

A single-round anagram puzzle built on `@dnd-kit/sortable` for the draggable letter tiles. Each letter is given a unique id (letter + original index) so duplicate letters in a word remain distinct to the drag-and-drop system. After every drop, the current tile order is reconstructed into a string and compared against the target term to detect a solve. A category hint is available; using it locks in a Quit option for revealing the answer. Words of four characters or fewer are filtered out to keep puzzles non-trivial.

## Data

- `@/data/chessterms` — source of all puzzle words, tagged by type (`T` term, `P` player, `O` opening, `E` engine, `W` world champion). The `Type` field drives the category hint text.
