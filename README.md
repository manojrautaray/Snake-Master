# 🐍 Snake Master — Neon Edition

A polished, feature-rich Snake game built entirely in vanilla HTML, CSS, and JavaScript. No frameworks. No libraries. Modular static files you can host on GitHub Pages or open locally for quick play.

---

## 🎮 Play It

Open `index.html` in any modern browser, or host the folder as a static site. No build step, no package install, no dependencies.

```bash
git clone https://github.com/your-username/snake-master.git
cd snake-master
open index.html   # macOS
# or double-click index.html on Windows/Linux
```

---

## ✨ Features

### Core Gameplay
- Classic Snake movement on a **20×20 grid**
- **Wrapping walls** — the snake passes through edges and appears on the opposite side, no instant death
- Self-collision ends the game
- 3 → 2 → 1 → GO! **countdown** before every game starts

### Scoring & Progression
| System | How it works |
|---|---|
| **Score** | +10 points per food eaten, multiplied by current multiplier |
| **Multiplier** | Increases every 5 segments grown (+1× per tier) |
| **Speed** | 10 levels — scales smoothly from slow start to fast maximum as the snake grows |
| **Distance** | Accumulates in km continuously while alive, independent of score |

### HUD (always visible)
Left to right: **Score · Multiplier · Distance · Speed · Best Score · Best km**

### Skin System
6 unlockable skins, each with a distinct solid colour and glow:

| Skin | Unlock Condition |
|---|---|
| 🔵 Cyber | Default — always available |
| 🟢 Venom | Score 500 |
| 🔴 Plasma | Score 1 500 |
| 🟡 Gold Rush | Travel 1.5 km |
| 🟣 Shadow | Score 3 000 |
| 🟠 Inferno | Travel 5 km |

Selected skin is saved to `localStorage` and persists across sessions.

### Game Over Screen
- **This Run** — large prominent score, distance, and max multiplier
- **Personal Bests** — quieter panel below showing best score and best distance
- New records flash with a brightness animation
- **Play Again** or **Home** buttons

### Audio
All audio generated live via the **Web Audio API** — no audio files needed:
- 🎵 **BGM** — ambient pentatonic arp sequencer with soft kick, hi-hat, bass drone, and atmospheric pad. Tempo scales from ~90 BPM (slow) to ~160 BPM (max speed) in real time
- 🔊 **Eat SFX** — layered sine tone chord
- 💥 **Game Over SFX** — descending triangle wave sequence
- ⏱ **Countdown ticks** — distinct tones for numbers and GO!

### Visuals
- Neon glassmorphism UI with animated scrolling grid background
- Square snake tiles with a subtle top-left highlight edge
- Square food tiles with a pulsing radial gradient and glow
- Particle burst effect on food eaten (pooled — zero GC pressure)
- Animated snake head (subtle vertical bob) with directional eyes
- Screen shake + haptic vibration on game over

---

## 🕹 Controls

| Platform | Control |
|---|---|
| Desktop | Arrow keys `↑ ↓ ← →` |
| Desktop | `Space` to start |
| Mobile | Swipe in any direction or use the on-screen keypad |
| Mobile | Tap START GAME button |

---

## 🏗 Technical Details

**Modular static app** — HTML, CSS, and browser modules are split by responsibility:

```
index.html
├── styles.css
├── manifest.webmanifest
├── service-worker.js
├── icons/
└── src/
    ├── core/
    ├── data/
    ├── render/
    ├── systems/
    └── ui/
```

### Performance choices
- **Offscreen canvas** for the grid — drawn once, reused every frame via `drawImage()`
- **`Set`-based collision** — O(1) snake body lookup instead of O(n) array scan
- **Pre-allocated particle pool** — 80 fixed objects, zero heap allocation during gameplay
- **rAF timing** — single `requestAnimationFrame` loop drives both rendering and game ticks; tick interval accumulates cleanly to avoid drift
- **HUD dirty-checking** — DOM text nodes only update when values actually change

### Storage
Uses `localStorage` for scores, distances, selected skin, selected mode, mobile control preference, stats, and achievement unlocks.

---

## 📁 File Structure

```
snake-master/
├── index.html
├── styles.css
├── manifest.webmanifest
├── service-worker.js
├── icons/
├── src/
└── README.md
```

---

## 🌐 Browser Support

Works in all modern browsers that support:
- Canvas 2D API
- Web Audio API
- CSS `backdrop-filter`
- `localStorage`
- Service workers for install/offline support

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ |
| Firefox 90+ | ✅ |
| Safari 15+ | ✅ |
| Edge 90+ | ✅ |
| Mobile Chrome | ✅ |
| Mobile Safari | ✅ |

---

## 🚀 Deployment

Since it is a static app, you can host it anywhere:

**GitHub Pages**
```bash
# Push to your repo, then enable GitHub Pages in Settings → Pages.
# The app can be served directly from the repository root.
```

**Netlify / Vercel**
```bash
# Deploy the full project folder as a static site
```

**Any static host** — the app has zero build-time dependencies. Google Fonts gracefully degrade if offline.

---

## 📄 License

MIT — do whatever you like with it.
