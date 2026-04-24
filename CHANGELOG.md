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

## v0.003

- Replaced the repository README with the provided richer version

## v0.002

- Added GitHub Pages deployment setup
- Added `.gitignore`
- Added `.nojekyll`
- Added GitHub Actions Pages workflow

## v0.001

- Initial playable Snake Master project checkpoint in the repository
