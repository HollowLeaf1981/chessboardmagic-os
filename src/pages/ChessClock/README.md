# Chess Clock

A two-sided chess clock for over-the-board play, designed primarily for mobile (rotate-and-share phone use case).

## Overview

The top panel is White's clock, rotated 180° so it reads the right way up to the player sitting on that side of the phone; the bottom is Black's. Tapping the active side's panel ends that side's turn and starts the other's. Inactive taps, paused taps, and taps on a flagged (zero-time) side are no-ops, so the player can't accidentally cheat themselves out of time by mistapping. The middle control bar holds Pause/Play, Edit, Restart, Settings, and Fullscreen — Fullscreen uses the browser Fullscreen API so on mobile it hides the browser chrome and gives the clock the entire viewport.

The tick loop runs on `requestAnimationFrame` rather than `setInterval`. setInterval drifts over long sessions (a 90-minute classical game would accumulate noticeable error); rAF gives a delta-time computation per frame which stays accurate even when tabs are backgrounded and reawoken. Time values are held in refs (`whiteTimeRef`, `blackTimeRef`) and only synced to React state once per frame — letting setState batch the render rather than triggering 60 re-renders per second.

The green active-layer slide is now a Tailwind `transition-[height] duration-300 ease-out`, driven directly from the `activePlayer` state. Each side's panel has a grey base layer (z-index 1), a green active layer (z-index 2) whose height animates between 0% and 100%, and a content layer (z-index 3) for the time readout — that stacking makes the layer cover the panel smoothly when this side becomes active without any imperative animation library.

## Configuration

Two dialogs handle changing the time:

- **Settings (preset picker)** — picks from a list of standard time controls from 1+0 bullet up to 120+30 classical. Selecting a preset only updates temporary state; Save commits it to the displayed times, the refs, and the "committed customs" used as the Restart target. Cancel discards.
- **Edit (manual override)** — three Hours/Minutes/Seconds selects per side, for ad-hoc adjustment of the currently-displayed times mid-game (e.g. if you started the wrong preset). Edit changes only affect the displayed times, not the Restart target.

Restart goes through a confirmation step rather than firing immediately, since a misplaced thumb mid-game would otherwise wipe the position.

## Styling

This component ships with a sibling `ChessClock.css` file for one specific reason: the `.clickable-box` class targets browser-default mobile tap chrome that can't be expressed as inline Tailwind utilities. `-webkit-tap-highlight-color: transparent` kills the blue flash on iOS Safari, `outline: none` kills focus rings, `user-select: none` stops the click from selecting nearby text, and the `:active { background-color: inherit }` rule stops the panel from briefly dimming on tap. Without these, the player clock panels feel like generic clickable divs rather than dedicated tap targets.
