# Hangman

Chess-themed hangman. Guess the term one letter at a time before five wrong tries.

## Overview

Each round picks a random entry from the chess terms dataset that's at least eight characters long — anything shorter doesn't give enough room for a satisfying guessing game. The term's `Type` field drives the hint label, so the player learns up front whether they're guessing a term, player, engine, or opening (with `P` and `W` both mapped to "Chess Player"). Only A–Z and 0–9 characters need to be guessed; spaces, punctuation, and other symbols are revealed for free and rendered in place so the board layout matches the underlying term.

The guess input accepts a single uppercase A–Z character and submits on Enter, keeping focus afterwards for fast letter-after-letter play. Wrong guesses increment `errorCount`, which both drives the hangman image (`hangman0.png` through `hangman5.png`) and ends the game at five strikes. A two-button control row toggles between Hint and Quit: once Hint is used, it's replaced by Quit so the player can concede gracefully. Win and loss share the same end-state, distinguished by `isCorrect` for the banner, and both reveal the full term and its dataset description so the player walks away knowing what they were guessing.

## Data

- `@/data/chessterms` — source of terms, filtered to `Length >= 8`. The `Type` field maps to the hint label (`T` → Chess Term, `P`/`W` → Chess Player, `E` → Chess Engine, `O` → Chess Opening). The `Description` field is shown after the round ends.

## Assets

- `/img/hangman/hangman0.png` through `/img/hangman/hangman5.png` — the six hangman stages, indexed by `errorCount`.
