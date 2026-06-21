# Guess Who

Identify a famous chess player from their portrait, with optional difficulty modifiers that blur or desaturate the image.

## Overview

Each round picks a random player-type entry from the chess terms dataset (`Type` of `P` or `W` — both map to players) and loads the matching portrait from `/img/players/{Key}.png`. Six name options are presented: the correct answer plus five decoys, with decoys filtered to match the target's `Gender` field so gender clues from the portrait don't give away the answer for half the dataset. The options are shuffled so the correct one isn't always in the same spot.

Difficulty acts purely on the portrait via a CSS filter — `easy` shows the clear image, `medium` applies a 5px blur, `hard` applies a 10px blur plus full desaturation. Wrong guesses disable that specific button rather than ending the round, so the player can keep trying until they identify the player. Once they guess correctly, the filter is removed so they can see the unobscured portrait, and the dataset's `Description` is revealed in the side panel alongside a green tick.

## Data

- `@/data/chessterms` — source of player entries, filtered to `Type === 'P' || Type === 'W'`. The `Key` field builds the image path, `Term` is shown on the option buttons, `Description` is revealed after a correct guess, and `Gender` is used to filter the decoy pool.

## Assets

- `/img/players/{Key}.png` — portrait images, one per player entry, keyed by the dataset's `Key` field.
