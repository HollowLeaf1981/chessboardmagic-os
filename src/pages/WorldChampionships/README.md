# World Championships

Browse and replay games from World Chess Championship matches.

## Overview

The page loads World Championship games from the local `worldChampionshipGames` dataset and lets the user browse them in three levels: championship type, match/event, and individual game. Changing the championship type resets the event and game selections, and changing the event resets the selected game back to Game 1.

Each selected game is passed into the shared `GameViewer` component, including the players, Elo ratings, event name, site, date, result, round, ply count, and move list. The page itself only manages the filtering and selection state; all board display, move navigation, and game replay behaviour is handled by `GameViewer`.

The default selection opens the reunified championship period and the 2024 Ding Liren vs Gukesh Dommaraju match when that data exists. If the default type is not found in the dataset, the page falls back to the first available championship type.

## Data

- `@/data/worldChampionship` — source dataset for the World Championship events.
- Each event is grouped by `Type`, such as a championship era or period.
- Each event includes metadata such as `Event`, `Site`, `EventDate`, and optional `EventDescription`.
- Each event contains a `Games` array, where each game provides the player names, Elo ratings, date, result, round, ply count, and moves used by `GameViewer`.
