# Space Visualizer

A chess training tool that shows who controls each square on the board, move by move. A visual way to understand space, pressure, and positional dominance.

## What it does

Play through moves manually or paste a PGN. Two overlays visualize square control:

- **Pressure map** — a radial gradient on each square, green where White has more attackers, red where Black does. Intensity scales with the differential.
- **Square coloring** — tints each square with the same colors as a solid background.

Both overlays toggle independently and the board can be flipped at any time.

## Usage

- **New Game** — clears to the starting position
- **Load Game** — paste a PGN; variations and comments are preserved
- **Drag pieces** to add moves. Moves transposing into an existing position are linked automatically (no duplicate subtrees)
- **Move tree** — click any move to jump there. Right-click for "Delete Move" (removes the move and everything downstream; if the move was the mainline and had variations, the first variation is promoted)
- **Copy / Download PGN** — export the current move tree
- **Arrow keys** — navigate forward and back along the current line

## File layout

- `index.tsx` — page shell. Owns the top-level `moves` tree and `selectedMoveId`, plus the PGN import dialog.
- `chessboardCard.tsx` — chessboard, pressure-map canvas, square overlay, and navigation buttons. Owns the chess.js game instance and keeps it in sync with the selected move.
- `movesCard.tsx` — tree view of moves with indented variations, transposition indicators (`↪T`), and right-click delete.
- `exportCard.tsx` — Copy PGN / Download PGN buttons.
- `helper.ts` — move tree types (`MoveNode`, `MoveTree`) and all pure tree operations.

### Move tree

The move tree is a flat dictionary keyed by move id, with a reserved `root` sentinel:

```ts
{
  root: { san: "", next: "id1", variations: [], parent: null },
  id1:  { san: "e4", next: "id2", variations: ["id3"], parent: "root", fen, ... },
  id2:  { san: "e5", next: null, variations: [], parent: "id1", ... },
  id3:  { san: "c5", next: null, variations: [], parent: "id1", ... },
}
```

All tree mutation lives in `helper.ts` as pure functions that take the current tree and return a new tree plus the id that should become selected:

- `addMoveToTree(moves, selectedMoveId, san)` — adds a move with transposition detection
- `deleteMoveFromTree(moves, moveIdToDelete)` — removes a subtree, promoting the first variation if the deleted move was the mainline
- `getMoveSequence(moves, fromMoveId)` — walks back to root, returning SANs in order
- `getNextMoveId(moves, currentMoveId)` / `getPreviousMoveId(moves, currentMoveId)` — navigation
- `convertMoveTreeToPGN(moves)` / `processPGN(pgn)` — PGN round-tripping

Components don't mutate the tree directly; they call these helpers and pass the result through React state.
