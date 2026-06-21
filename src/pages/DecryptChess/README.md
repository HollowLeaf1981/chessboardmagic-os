# Decrypt Chess

Solve a substitution cipher applied to a chess term and its description by swapping letter pairs.

## Overview

Each round picks a random chess term and generates a fresh A–Z permutation. The permutation is applied to both the term and its description, preserving original casing so capitalisation survives as a structural hint to the player. The player solves the puzzle by clicking two letters in the A–Z palette to swap every occurrence of those two letters throughout the ciphertext — a classic substitution-cipher UI.

Letter swaps are performed in a single pass to avoid the sequential-replace cancellation trap (swap A→B then B→A would undo itself). The win check runs inside the `setEncryptedTerm` state updater so it operates on the freshly-computed values rather than a stale closure. A category hint (term/player/opening/engine/world champion) is available; using it switches the controls into a Quit flow with a Confirm/Cancel confirmation step, where confirming reveals the plaintext. `Chess960` is filtered out of the puzzle pool because its digits would survive the cipher unchanged and give the answer away.

## Data

- `@/data/chessterms` — source of the puzzle term and description, with `Type` driving the category hint label.
