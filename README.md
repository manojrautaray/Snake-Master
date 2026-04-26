# Snake Master — Neon Edition

Fast, glassy, and unapologetically arcade. **Snake Master** is a polished browser Snake game built with vanilla HTML, CSS, and JavaScript, then shaped into a mobile-friendly installable PWA.

[Play on GitHub Pages](https://manojrautaray.github.io/Snake-Master/)

Current release: `v0.020`

---

## Why This Game Exists

Snake is simple, but it does not have to feel small. This version keeps the core loop pure: move fast, eat food, grow longer, survive longer. Around that loop it adds modern game feel: neon visuals, generated audio, mobile controls, achievements, stats, skins, modes, haptics, and an app-like home screen.

No framework. No build step. No backend. Just a static game that can live comfortably on GitHub Pages.

---

## Highlights

| Area | What You Get |
|---|---|
| Modes | Classic, Time Attack, and Hardcore |
| Progression | Persistent stats, bests, skins, and 100 achievements |
| Mobile | Swipe controls or a large on-screen keypad |
| PWA | Add to Home Screen support, icon set, safe-area handling, service worker cache |
| Audio | Web Audio API music and effects generated at runtime |
| Visuals | Neon glass UI, animated grid, particles, glow, screen shake |
| Architecture | Modular browser-side JS with no dependencies |

---

## Game Modes

| Mode | Personality | Rules |
|---|---|---|
| Classic | Pure arcade flow | Wrap walls, standard score, steady growth |
| Time Attack | Fast sprint | 60-second timer with boosted score payouts |
| Hardcore | No mercy | Solid walls, faster start, higher reward |

The home screen presents modes as a cyber card carousel with arrows and swipe support. The Start button inherits the selected mode color so the current choice always feels obvious.

---

## Progression Systems

### Skins

Unlock and equip neon snake skins through score and distance milestones.

| Skin | Unlock |
|---|---|
| Cyber | Default |
| Venom | Score 500 |
| Plasma | Score 1500 |
| Gold Rush | Travel 1.5 km |
| Shadow | Score 3000 |
| Inferno | Travel 5 km |

The home screen shows the active skin at a glance, including a mini color rail inside the Skins tile.

### Achievements

The game includes **100 stat-driven achievements** across food, distance, mode play, multipliers, best scores, and lifetime progress. Achievements are presented as premium badge cards with progress bars and unlock visuals.

### Stats

Runs, food, distance, score, time, and best multiplier are saved locally and split across lifetime totals and mode-specific records.

---

## Controls

| Platform | Controls |
|---|---|
| Desktop | Arrow keys to steer, Space to start |
| Mobile Swipe | Swipe on the board or bottom control deck |
| Mobile Keys | Large thumb-friendly on-screen keypad |
| Home Mode Select | Tap arrows, swipe the mode card, or tap a mode card |

Mobile control preference is saved in `localStorage`.

---

## App-Like Mobile Experience

Snake Master is set up as a Progressive Web App:

- Installable with **Add to Home Screen**
- Safe-area spacing for iPhone notch and home indicator
- SVG and PNG app icons
- Service worker cache for core static assets
- Version pill on the home screen to confirm deployed releases
- Haptic feedback where supported by the browser

Note: iOS Safari may ignore `navigator.vibrate`, but Android Chromium browsers generally support it.

---

## Under The Hood

The project is intentionally small and readable.

```text
Snake-Master/
├── index.html
├── styles.css
├── manifest.webmanifest
├── service-worker.js
├── icons/
└── src/
    ├── config.js
    ├── main.js
    ├── core/
    ├── data/
    ├── render/
    ├── systems/
    ├── ui/
    └── utils/
```

### Performance Choices

- Canvas rendering for the board and snake
- Cached grid canvas so the background grid is not redrawn from scratch every frame
- `Set`-based snake collision lookup
- Preallocated particle pool to reduce runtime allocation
- Dirty-checking for HUD text updates
- `requestAnimationFrame` loop with tick accumulation for stable movement

---

## Local Play

Clone the repo and open `index.html`.

```bash
git clone https://github.com/manojrautaray/Snake-Master.git
cd Snake-Master
open index.html
```

For the service worker/PWA flow, serve it from a local static server or GitHub Pages.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

---

## Deployment

The game is a static site and is already shaped for GitHub Pages.

```bash
git push origin main
```

GitHub Pages can serve it directly from the repository root. Each release is tracked with lightweight git tags like `v0.018`, `v0.019`, `v0.020`.

---

## Browser Support

Snake Master targets modern browsers with support for:

- Canvas 2D
- ES modules
- Web Audio API
- `localStorage`
- Service workers
- CSS backdrop filters and safe-area insets

---

## Roadmap Ideas

- Daily Challenge mode
- Share Score button
- More skins and visual themes
- Better post-run summary cards
- Optional power-up experiments
- Leaderboard backend if the project grows beyond local play

---

## License

MIT. Play with it, fork it, remix it, or use it as a learning project.
