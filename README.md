# Snake Master

A polished, feature-rich Snake game built entirely in vanilla HTML, CSS, and JavaScript. No frameworks. No libraries. One single `index.html` file you can open in any browser and play instantly.

---

## Play Online

After GitHub Pages is enabled for this repository, the game will be available at:

`https://manojrautaray.github.io/Snake-Master/`

---

## Play Locally

Just open `index.html` in any modern browser. No build step, no server, no dependencies.

```bash
git clone https://github.com/manojrautaray/Snake-Master.git
cd Snake-Master
open index.html
```

---

## Features

### Core Gameplay
- Classic Snake movement on a 20x20 grid
- Wrapping walls: the snake passes through edges and appears on the opposite side
- Self-collision ends the game
- 3 -> 2 -> 1 -> GO! countdown before every game starts

### Scoring And Progression
| System | How it works |
|---|---|
| Score | +10 points per food eaten, multiplied by current multiplier |
| Multiplier | Increases every 5 segments grown (+1x per tier) |
| Speed | 10 levels that scale smoothly from slow start to fast maximum as the snake grows |
| Distance | Accumulates in km continuously while alive, independent of score |

### HUD
Left to right: Score, Multiplier, Distance, Speed, Best Score, Best km

### Skin System
Six unlockable skins, each with a distinct solid color and glow:

| Skin | Unlock Condition |
|---|---|
| Cyber | Default |
| Venom | Score 500 |
| Plasma | Score 1500 |
| Gold Rush | Travel 1.5 km |
| Shadow | Score 3000 |
| Inferno | Travel 5 km |

Selected skin is saved to `localStorage` and persists across sessions.

### Audio
All audio is generated live with the Web Audio API:
- Ambient background music with a tempo that follows game speed
- Eat sound effects
- Game over sound effects
- Countdown tones

### Visuals
- Neon glassmorphism UI with animated scrolling grid background
- Square snake tiles with a subtle highlight edge
- Square food tiles with pulsing glow
- Particle burst effect on food eaten
- Animated snake head with directional eyes
- Screen shake and vibration on game over

---

## Controls

| Platform | Control |
|---|---|
| Desktop | Arrow keys |
| Desktop | Space to start |
| Mobile | Swipe in any direction |
| Mobile | Tap the Start Game button |

---

## Technical Details

Everything lives in a single `index.html` file:

```text
index.html
├── CSS
├── Canvas API
└── JavaScript
```

Performance choices:
- Offscreen canvas for the grid
- `Set`-based collision lookup
- Pre-allocated particle pool
- `requestAnimationFrame` loop for rendering and ticks
- HUD dirty-checking to avoid unnecessary DOM writes

Storage keys:

| Key | Value |
|---|---|
| `sm_best` | Best score |
| `sm_dist` | Best distance in km |
| `sm_skin` | Selected skin ID |

---

## Deployment

### GitHub Pages

This repo includes a GitHub Pages workflow. After pushing to `main`:

1. Open `Settings -> Pages`
2. Set the source to `GitHub Actions` if prompted
3. Let the workflow deploy the site

Expected URL:

`https://manojrautaray.github.io/Snake-Master/`

### Other Static Hosts

You can also deploy this project to Netlify, Vercel, or any static host.

---

## License

MIT
