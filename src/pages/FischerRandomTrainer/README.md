# Fischer Random Trainer

A Chess960 training tool. Stockfish tells you _which piece_ to move at each turn — but not where. You pick the destination, and the engine grades your move against its own recommendation.

## What it does

Each turn, Stockfish analyses the position at depth 15 and surfaces the piece name (e.g. "Knight") for the user to move. The full recommended SAN is kept hidden and used to grade the move once you play it: green alert if you matched, red if you didn't, with the recommended move revealed afterwards. Running totals of correct/incorrect moves and accuracy are shown alongside.

Stockfish plays the opposing side at depth 10.

## Data

- `@/data/fischerrandom` — the 960-entry array of starting FENs (provided separately)

## Dependencies

- `public/js/stockfish/stockfish-18-lite-single.js` — the Stockfish web worker (provided separately)

### Mechanism notes

A few things worth knowing if you're reading the code:

- **Chess960 UCI flag** — Stockfish needs `setoption name UCI_Chess960 value true` to legal-check castling under Fischer Random rules. It's latched by a ref so it fires once per worker lifetime, re-armed when a new position loads.
- **Two depths** — the engine analyses at depth 15 when recommending moves to the user (so the hint is trustworthy) and depth 10 when playing its own moves.
- **Recommendation flow** — Stockfish returns a UCI bestmove; the source-square piece is shown to the user (`recommendedPiece`), the full SAN is stashed in `recommendedMove`. When the user moves, `recommendedMove` is snapshotted into `previousRecommendedMove` so the post-move alert can show what was recommended without being clobbered by the next recommendation.
- **SAN reconstruction** — `getPieceRecommendation` reconstructs the chessops game from the FEN it sent to Stockfish before calling `makeSan`. Using the closure's `game` would produce stale SANs (e.g. "Bd3" instead of "Bxd3") because by the time Stockfish responds, the closure points at the pre-engine-move position.
- **In-place game mutation** — the user-move paths (`onDrop`, `handlePromotionChoice`) mutate `game.play(move)` directly rather than cloning. This keeps the `game` reference stable so the `setTimeout(makeEngineMove, 500)` closure sees the post-move position when it fires. Cloning would cause Stockfish to be called with the position from before the user moved, and the user's move would get overwritten.
- **Custom promotion overlay** — the `onDrop` handler returns `false` for promotion moves, which makes react-chessboard snap the pawn back visually while the overlay opens on the target square. `handlePromotionChoice` then applies the move with the chosen piece role.
