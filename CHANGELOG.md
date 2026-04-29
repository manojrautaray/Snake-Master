# Changelog

All notable project checkpoints are tracked with git tags using this versioning style:

- `vX.000` for major milestones
- `vX.Y00` for medium milestones
- `vX.YYY` for small milestones

## v0.001

- Initial playable Snake Master project checkpoint in the repository
  
## v0.002

- Added GitHub Pages deployment setup
- Added `.gitignore`
- Added `.nojekyll`
- Added GitHub Actions Pages workflow
  
## v0.003

- Replaced the repository README with the provided richer version

## v0.004

- Refactored the app shell by splitting inline assets out of `index.html`
- Added `styles.css`
- Added `src/main.js`
- Kept gameplay behavior unchanged while preparing the codebase for modularization

## v0.005

- Converted the browser bootstrap to ES modules
- Added `src/config.js`, `src/data/skins.js`, `src/systems/storage.js`, `src/ui/dom.js`, and `src/utils/colors.js`
- Kept gameplay behavior unchanged while splitting reusable browser-side systems into dedicated files

## v0.006

- Added `src/core/game-state.js` for shared state shape and game helpers
- Added `src/render/game-renderer.js` to own canvas drawing and grid rendering
- Added `src/systems/audio.js` so `src/main.js` now focuses more on game flow orchestration

## v0.007

- Added a real game mode system with `Classic`, `Time Attack`, and `Hardcore`
- Added mode selection UI to the start screen and persisted the selected mode in storage
- Added mode-specific rules for wall behavior, timer handling, score bonuses, and best-score tracking

## v0.008

- Added a persistent stats layer for lifetime and per-mode progression
- Tracked runs played, food eaten, total time, total distance, and best multiplier
- Added a start-screen stats panel so progression is visible between runs

## v0.009

- Simplified the home screen by moving How to Play, Stats, and Achievements behind compact buttons
- Reused one focused home detail panel so informational sections no longer stack on the start screen
- Added an Achievements panel preview ahead of the full achievement system

## v0.010

- Added persisted achievement unlocks driven by the existing stats and best-score systems
- Replaced the Achievements preview with real locked/unlocked achievement cards
- Moved skin selection directly below mode selection on the home screen

## v0.011

- Added a game-over achievement unlock panel for newly earned achievements
- Kept the home Achievements panel as the full locked/unlocked collection view
- Highlighted unlocks immediately after a run so progression feedback is visible

## v0.012

- Converted How, Stats, Achievements, and Settings into popup panels
- Expanded the achievement catalog to 100 stat-driven achievements with premium card badges and progress bars
- Added a persisted mobile control setting for Swipe or on-screen Keys
- Added a mobile portrait D-pad layout while keeping the board `20 x 20` across devices
- Updated How content to reflect modes, skins, achievements, and mobile control options

## v0.013

- Enlarged the mobile on-screen key controls for easier thumb input
- Kept the bottom control area active in Swipe mode as a dedicated swipe pad
- Preserved the square `20 x 20` board while improving mobile portrait ergonomics

## v0.014

- Expanded the mobile control deck to span the whole bottom of the screen
- Made the key layout use large full-width touch targets for easier thumb play
- Made Swipe mode use the same full bottom deck as the gesture capture area

## v0.015

- Added PWA install metadata, a service worker, and neon SVG/PNG app icons
- Added mobile haptics for input, food, countdown start, crashes, and achievement unlocks
- Added mobile viewport safe-area polish and a subtle in-game version marker

## v0.016

- Fixed installed iOS PWA notch overlap on the home and game-over overlays
- Applied shared safe-area spacing to overlays, modals, the app root, and mobile control decks
- Bumped the service-worker cache and visible version marker for the safe-area fix

## v0.017

- Reworked the home screen around a Cyber Card Stack mode selector
- Moved Skins into a popup and added it to the Mission Control-style home tiles
- Added richer home action tile metadata for skins, achievements, stats, and controls

## v0.018

- Added left/right arrow controls and swipe navigation for the home mode selector
- Kept the selected mode card large and rectangular for easier reading and tapping
- Reordered the home screen hierarchy to show modes, then Start, then secondary options

## v0.019

- Reserved side gutters so mode navigation arrows no longer overlap the mode card
- Made the selected mode card taller while preserving the rectangular mockup style
- Added more vertical breathing room between the mode stack, Start button, and option tiles

## v0.020

- Normalized mode card sizing so all modes use the same fixed card layout
- Made the Start button taller and themed it with the selected mode color
- Added an active-skin color rail to the Skins home tile
- Replaced the README with a richer, up-to-date project overview

## v0.021

- Redesigned the README as a visual project landing page with neon SVG hero and showcase panels
- Added badges, mode/skin visuals, feature cards, and a richer GitHub-friendly layout
- Kept the documentation aligned with the current PWA, home screen, progression, and release flow

## v0.022

- Restored a clear short game description near the top of the README
- Updated the README release badge and version examples for the latest docs checkpoint

## v0.023

- Reworked Game Over into a richer Run Report Card with outcome, mode, score, and new-best callouts
- Added food eaten, run time, final pace, and active skin details to the post-run summary
- Upgraded newly unlocked achievements into badge-style report cards
- Bumped the visible app version and service-worker cache for the gameplay UI update

## v0.024

- Simplified Game Over back to a compact `GAME OVER` report without the extra mission/report wording
- Replaced individual Game Over achievement cards with a small count summary
- Added a persistent new-achievement notification badge on the home Achievements button
- Cleared the achievement notification badge when the Achievements popup is opened

## v0.025

- Added a Share Score action to the Game Over screen
- Used native device sharing when available and clipboard copy as a desktop fallback
- Added compact share status feedback after sharing, copying, or cancelling
- Bumped the visible app version and service-worker cache for the share feature

## v0.026

- Upgraded Share Score to generate a neon PNG score card from the Game Over run data
- Added image-file sharing through the Web Share API where supported
- Added image clipboard fallback before falling back to text-only sharing
- Matched the share card layout to the approved visual mockup with score, mode, stats, snake preview, achievements count, and game link

## v0.027

- Added a Daily Challenge mode with a date-seeded start and food sequence
- Added daily attempts, today-best, streak, and all-time daily best tracking
- Updated the home mode deck, stats popup, Game Over report, and score sharing for daily challenge runs
- Bumped the visible app version and service-worker cache for the daily challenge release
