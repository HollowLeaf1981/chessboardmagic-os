# Rotating Image Puzzle

Rotate each tile of a sliced chess-player portrait back to 0° to reveal the original image.

## Overview

Each round picks a random player-type entry from the chess terms dataset (`Type` of `P` or `W` — both map to players) and loads the matching portrait from `/img/players/{Key}.png`. The image is sliced into an N×N grid of tiles where N is selectable from 3 to 10. Each tile starts at a random multiple of 90° and the player clicks to rotate clockwise; the puzzle is solved when every tile's rotation is back at a multiple of 360°. The accumulating rotation value (rather than capping at 270°) keeps the spin animation smooth — `% 360` handles the correctness check.

The slicing effect is done entirely with `background-position`: every tile renders the full source image as its background, sized to the total grid size, then offset by the tile's `(x, y)` so the right portion of the image shows through. This means rotation just spins the tile element while the background stays put — no actual image cropping involved. A `ResizeObserver` watches the container so tile size recalculates whenever the layout changes. Once solved, the grid collapses to a single `<img>` for a seamless final view, and the player's name + description are snapshotted into the reveal column so they stay stable even if a new game is started.

A "Lock on correct" toggle prevents clicks on tiles already at 0° (mod 360), which makes larger grid sizes (8×8, 9×9, 10×10) workable — without it, accidental clicks on solved tiles knock them back out of alignment and the puzzle becomes a chore.

## Data

- `@/data/chessterms` — source of player entries, filtered to `Type === 'P' || Type === 'W'`. The `Key` field builds the image path, `Term` and `Description` are shown after solving.

## Assets

- `/img/players/{Key}.png` — portrait images, one per player entry, keyed by the dataset's `Key` field.
