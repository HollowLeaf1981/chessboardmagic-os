# Glossary

Searchable glossary of chess terminology.

## Overview

A flat list view with a single text input acting as a live substring filter against the `Term` field (case-insensitive). The shared `chessterms` dataset mixes several categories, so this page filters to `Type === 'T'` to show only glossary terms — players, openings, engines, and world champions are excluded. The filtered list is memoised via `useMemo` and sorted alphabetically by `Key`.

## Data

- `@/data/chessterms` — full terminology dataset, of which only entries with `Type === 'T'` are displayed here.
