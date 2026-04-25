# Changelog

All notable project checkpoints are tracked with git tags using this versioning style:

- `vX.000` for major milestones
- `vX.Y00` for medium milestones
- `vX.YYY` for small milestones

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

## v0.003

- Replaced the repository README with the provided richer version

## v0.002

- Added GitHub Pages deployment setup
- Added `.gitignore`
- Added `.nojekyll`
- Added GitHub Actions Pages workflow

## v0.001

- Initial playable Snake Master project checkpoint in the repository
