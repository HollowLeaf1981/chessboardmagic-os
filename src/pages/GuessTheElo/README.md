# Guess The Elo

Estimate both players' Elo ratings from a real game they played.

## Overview

Each round picks a random anonymised game from a Lichess database snapshot, loads its PGN through `chess.js`, and lets the player step through the moves on the board — via the prev/next buttons, the left/right arrow keys, or by clicking directly on a move in the formatted move list. The time control is shown above the move list so the player has that context too (a 3+2 blitz game looks very different from a 30+0 classical one at the same rating).

Once the player has formed an opinion, they enter a guess for each side's Elo and click Guess. The real ratings are revealed alongside the player's deltas (positive = over-estimated, negative = under-estimated) so they can see how far off they were. The inputs are text-mode rather than `type="number"` so the regex validation can preserve the empty state cleanly and keep arrow keys free for board navigation rather than being captured by browser number-input behaviour.

The clickable move list highlights the currently-displayed half-move with an underline so it's clear where the board sits in the game. The board itself is non-draggable — the only interaction is navigation, since playing your own moves would defeat the purpose of evaluating someone else's style.

## Data

The dataset is sourced from the [Lichess Open Database](https://database.lichess.org), which publishes monthly dumps of every rated game played on the site under the [CC0 license](https://database.lichess.org/#license). A single month's dump runs to tens of millions of games and is shipped as a multi-gigabyte PGN file, which is far too large to bundle into the app.

To get from that raw dump to `@/data/usergames`, a preprocessing script runs over the PGN file and extracts only the fields this game actually needs:

- **`P`** — the PGN move text itself (the part after the headers).
- **`T`** — the time control from the `[TimeControl "..."]` header, stored in the original `seconds+increment` format (e.g. `"180+2"` for 3+2 blitz).
- **`W`** — White's Elo from the `[WhiteElo "..."]` header, stored as a string.
- **`B`** — Black's Elo from the `[BlackElo "..."]` header, stored as a string.

Every other PGN header (player names, usernames, event, site, date, result, opening codes, evaluation annotations, clock times, etc.) is stripped. That serves two purposes: it keeps the bundle size sane by dropping everything the puzzle doesn't render, and it anonymises the data so the game can't be traced back to specific players, which would let a curious player look up the rating directly and trivialise the puzzle. The script also samples down to a manageable round count and filters out games that are too short to be interesting (under ~20 moves) before writing the final TypeScript module.

Field naming is deliberately terse (`P`, `T`, `W`, `B` rather than `pgn`, `timeControl`, `whiteElo`, `blackElo`) because the file holds a lot of entries and shorter keys add up to a meaningfully smaller bundle.
