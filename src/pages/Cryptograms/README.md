# Cryptogram

Decode seven chess terms encoded with a cipher drawn from chess notation symbols.

## Overview

Each round picks seven random chess terms and builds a fresh A–Z to chess-symbol mapping. The symbol set is drawn from standard PGN/NAG annotation glyphs (`!!`, `??`, `+`, `#`, `±`, `↑`, etc.) along with the piece letters (`K`, `Q`, `R`, `B`, `N`, plus `X` for capture). Players see the encoded symbols and type guesses into the input boxes beneath; the `guessedLetters` state is keyed by symbol, so solving one symbol fills every occurrence of it across all seven terms simultaneously.

The game tracks per-term completion separately from overall completion, giving players a tick mark as each individual term is solved. Three hints are available, each revealing one random unguessed letter and locking the corresponding input. Once hints are exhausted, a two-step Quit flow (Quit → Confirm/Cancel) lets the player reveal the solution. Tile size and the maximum term length both adapt to viewport width via a resize listener — narrow screens get smaller tiles and shorter words. Each symbol on screen has a tooltip explaining its meaning in standard notation, making the puzzle double as a chess-notation primer.

## Data

- `@/data/chessterms` — source of the seven terms per round, with the dataset's `Description` field shown beneath each term once the puzzle ends. `Chess960` is filtered out because the digits in it aren't supported by the alphabetic input boxes.
