# Play The Opening

Wordle-style recall drill — the opening's name is given up front, and you have six attempts to play out the exact move sequence.

## Overview

Each round picks a random opening from the ECO dataset filtered to the configured move count (6 to 12) and reveals its name above the board. The player drags pieces to play the line; once they've played the full sequence they click Guess to compare against the target. Each move gets a Wordle-style colour: green for right move at the right index, yellow for a right move at the wrong index, blank for a move not in the target line at all. Six attempts are allowed; running out (or clicking Quit) ends the round as a loss, matching every move in order ends it as a win.

This is the sibling to `GuessTheOpening` but inverts the challenge: there, you know the moves and have to deduce the name; here, you know the name and have to recall the moves. Use it to drill the lines you've actually studied. The correctly-placed moves accumulate across attempts in `correctGuesses` so the auto-complete button can replay them at the start of the next attempt. The auto-complete fills only a contiguous prefix: once a non-green move is hit, everything after it is blanked too, since a wrong move would put chess.js in the wrong position and the subsequent locked-in moves wouldn't be legal.

The board can be flipped between white and black orientation via the swap button. Once the round ends, the move list in the banner becomes clickable — click any move (or "Start") to jump the board to that position. Arrow keys (←/→) traverse the line the same way.

## Data

- `@/data/eco` — source of opening entries. Each entry provides a `name` (shown from the start of the round), a `pgn` string that's split into target SAN moves by stripping move numbers, and a `length` field used to filter the pool to a fixed move count per round.
