# Checkmate Trainer

Practice basic checkmating technique against Stockfish from randomly generated endgame positions.

## Overview

This page generates simplified endgame positions such as queen vs king, rook vs king, two rooks vs king, bishop and knight vs king, and other material combinations. The user plays White and tries to checkmate the black king while Stockfish defends.

When a new game starts, the selected material setup is placed randomly on the board. The position is regenerated until it passes the built-in validation checks: Black must not already be in check, checkmated, or stalemated. For the two bishops setup, the bishops are also forced onto opposite-coloured squares.

A timer starts when the game begins, and the move counter tracks the user's moves. After each legal user move, Stockfish replies at depth 12. The game stops automatically when checkmate, stalemate, or draw is reached.

## Game types

- Queen vs King
- Rook vs King
- Two Rooks vs King
- Queen vs Rook
- Two Bishops vs King
- Bishop Knight vs King
- Rook vs Bishop
- Rook vs Knight

## Dependencies

- `public/js/stockfish/stockfish-18-lite-single.js` — the Stockfish web worker used for the defending side
