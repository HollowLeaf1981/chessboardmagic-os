# Image Puzzle

Reassemble a scrambled portrait of a famous chess player into a 5×5 jigsaw.

## Overview

Each round picks a random player-type entry from the chess terms dataset (`Type` of `P` or `W` — both map to players) and loads the matching portrait from `/img/players/{Key}.png`. The image is passed to `react-jigsaw-puzzle`, which scrambles it into a 5×5 grid that the player drags back into place. The library fires `onSolved` when every piece is correctly positioned, which flips the `completed` flag and reveals the player's name and biographical description in the adjacent column.

The puzzle area uses a `padding-bottom: 100%` trick to lock a square aspect ratio regardless of viewport width, with a faint 5×5 grid overlay drawn from two CSS linear gradients so empty slots stay visible while pieces are still loose. When the dataset includes `ImageAuthor` and `License` fields for the chosen player, an attribution line is rendered under the puzzle linking out to the photo's original license.

## Styling

This component ships with a sibling `ImagePuzzle.css` file rather than relying solely on Tailwind. The reasons are specific to the third-party puzzle library and the grid overlay:

- **`.puzzle-container` + `::before` / `::after`** — the faint 5×5 grid overlay is drawn from two CSS linear gradients on pseudo-elements. Pseudo-elements can't be expressed inline via React's `style` prop, so this lives in CSS. The pseudos use `z-index: -1` to sit behind the puzzle pieces, which means the container's parent needs a non-transparent background (e.g. `bg-card`) to establish the stacking context the pseudos render against.
- **`.jigsaw-puzzle__piece`** — adds a 1px border around each loose piece and removes it once the piece is correctly placed (`.jigsaw-puzzle__piece--solved`). These class names come from `react-jigsaw-puzzle`'s internal markup, so the rules have to target them directly in a stylesheet — Tailwind utility classes can't be applied to a third-party component's internal DOM.

## Dependencies

- [`react-jigsaw-puzzle`](https://www.npmjs.com/package/react-jigsaw-puzzle) — drag-and-drop jigsaw component. The base stylesheet (`react-jigsaw-puzzle/lib/jigsaw-puzzle.css`) is imported alongside the component.

## Data

- `@/data/chessterms` — source of player entries, filtered to `Type === 'P' || Type === 'W'`. The `Key` field builds the image path, `Term` and `Description` are shown after solving, and `ImageAuthor`/`License` drive the optional attribution line.

## Assets

- `/img/players/{Key}.png` — portrait images, one per player entry, keyed by the dataset's `Key` field.
