# Chess Quotes

Searchable list of chess quotes filterable by author or quote text.

## Overview

A flat list view with a single text input acting as a live substring filter against both the `Author` and `Quote` fields (case-insensitive). The filtered list is memoised via `useMemo` so the filter only re-runs when the query changes, and results are sorted alphabetically by author. Each quote is rendered with the body in large type and the author beneath, separated by an em-dash.

## Data

- `@/data/chessquotes` — curated chess quotes with `Quote` and `Author` fields.
