# Guess The Opening

Wordle for chess openings. Play out the target move sequence in six attempts or fewer, with per-move feedback after each try.

## Overview

Each round picks a random opening from the ECO dataset filtered to the configured move count (6 to 12). The player drags pieces on the board to play moves; once they've played the full line they click Guess to compare against the target. Each move gets a Wordle-style colour: green for right move at the right index, yellow for a right move at the wrong index, blank for a move not in the target line at all. Six attempts are allowed; running out ends the round as a loss, matching every move in order ends it as a win.

The correctly-placed moves accumulate across attempts in `correctGuesses` so the auto-complete button can replay them at the start of the next attempt — useful once the player has locked in the first half of a line and wants to focus on the unknowns. The auto-complete fills only a contiguous prefix: once a non-green move is hit, everything after it is blanked too, since a wrong move would put chess.js in the wrong position and the subsequent locked-in moves wouldn't be legal anymore.

The board can be flipped between white and black orientation via the swap button — useful for openings where you want to think from black's side. Attempts history is rendered above the current row as one strip per submitted attempt, so the player can see their progression at a glance.

## Data

- `@/data/eco` — source of opening entries. Each entry provides a `name` (revealed in the post-round banner), a `pgn` string that's split into target SAN moves by stripping move numbers, and a `length` field used to filter the pool to a fixed move count per round.
