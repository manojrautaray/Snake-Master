import { APP_VERSION, BASE_MS, DIST_TICK, GRID, MIN_MS } from './config.js';
import {
  calcInterval,
  calcMultiplier,
  calcSpeedLevel,
  createGameState,
  keyFor,
  placeFood,
  resetGameState,
  resetHudCache,
} from './core/game-state.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { MODES } from './data/modes.js';
import { SKINS } from './data/skins.js';
import { buildGridCache, drawScene } from './render/game-renderer.js';
import { evaluateAchievements } from './systems/achievements.js';
import { createAudioController } from './systems/audio.js';
import { LS } from './systems/storage.js';
import { EL, ctx } from './ui/dom.js';

const state = createGameState();
const audio = createAudioController(() => state.tickInterval, MIN_MS, BASE_MS);

const KEY_MAP = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const CONTROL_DIRECTIONS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const HOME_PANELS = {
  skins: {
    title: 'Skins',
    button: () => EL.homeSkinsBtn,
    panel: () => EL.homeSkinsPanel,
  },
  how: {
    title: 'How to Play',
    button: () => EL.homeHowBtn,
    panel: () => EL.homeHowPanel,
  },
  stats: {
    title: 'Stats',
    button: () => EL.homeStatsBtn,
    panel: () => EL.homeStatsPanel,
  },
  achievements: {
    title: 'Achievements',
    button: () => EL.homeAchievementsBtn,
    panel: () => EL.homeAchievementsPanel,
  },
  settings: {
    title: 'Settings',
    button: () => EL.homeSettingsBtn,
    panel: () => EL.homeSettingsPanel,
  },
};

const HAPTICS = {
  input: 8,
  eat: 16,
  unlock: [28, 32, 28],
  countdownGo: 18,
};

let activeHomePanel = null;
let controlMode = LS.getControlMode();
let modeSwipeX0 = null;
let modeSwipeY0 = null;
let suppressModeCardClick = false;

function resize() {
  const hudHeight = EL.hud.getBoundingClientRect().height || 38;
  const availW = window.innerWidth - 8;
  const availH = window.innerHeight - hudHeight - 8;
  const size = Math.max(100, Math.floor(Math.min(availW, availH)));

  EL.canvas.width = size;
  EL.canvas.height = size;
  EL.canvas.style.width = `${size}px`;
  EL.canvas.style.height = `${size}px`;
  EL.canvasWrap.style.width = `${size}px`;
  EL.canvasWrap.style.height = `${size}px`;
  EL.hud.style.width = `${size}px`;
  EL.hud.style.maxWidth = `${size}px`;

  state.cellSize = size / GRID;
  state.gridCanvas = buildGridCache(state.cellSize, size);
}

function triggerScreenShake() {
  const wrap = EL.canvasWrap;
  wrap.classList.remove('shaking');
  void wrap.offsetWidth;
  wrap.classList.add('shaking');
  wrap.addEventListener('animationend', () => wrap.classList.remove('shaking'), { once: true });

  if (navigator.vibrate) {
    navigator.vibrate([70, 35, 110, 35, 55]);
  }
}

function vibrate(pattern) {
  if (!navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function resetGame() {
  resetGameState(state);
  placeFood(state);
  resetHudCache(state.hudCache);
  updateHUD();
}

function getModeBestScore() {
  return LS.getBest(state.currentMode.id);
}

function getModeBestDistance() {
  return LS.getBestDist(state.currentMode.id);
}

function getStatsSnapshot() {
  return LS.getStats();
}

function getBestScoresByMode() {
  return Object.fromEntries(MODES.map(mode => [mode.id, LS.getBest(mode.id)]));
}

function getAchievementContext(run = null, stats = getStatsSnapshot()) {
  return {
    stats,
    run,
    bestScores: getBestScoresByMode(),
  };
}

function syncAchievements() {
  const stats = getStatsSnapshot();
  const unlocked = LS.getAchievements();
  const newAchievements = evaluateAchievements(ACHIEVEMENTS, getAchievementContext(null, stats), unlocked);

  LS.unlockAchievements(newAchievements);
  return newAchievements;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized, 16);

  if (Number.isNaN(value)) return '0, 255, 136';

  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
}

function updateModeUI() {
  const isTimedMode = Boolean(state.currentMode.timerSeconds);
  EL.hSpeedLabel.textContent = isTimedMode ? 'Time' : 'Speed';
  EL.goBestHeader.textContent = `${state.currentMode.name} Bests`;
  EL.startBtn.textContent = `START ${state.currentMode.name.toUpperCase()}`;
  EL.startBtn.style.setProperty('--start-accent', state.currentMode.accent);
  EL.startBtn.style.setProperty('--start-accent-rgb', hexToRgb(state.currentMode.accent));
  if (activeHomePanel === 'stats') {
    EL.homeModalTitle.textContent = `${state.currentMode.name} Stats`;
  }
}

function setMode(modeId) {
  const nextMode = MODES.find(mode => mode.id === modeId) || MODES[0];
  if (nextMode.id === state.currentMode.id) return;

  state.currentMode = nextMode;
  LS.setMode(nextMode.id);
  updateModeUI();
  renderModesPanel();
  renderStatsPanel();
  resetGame();
  updateHomeActionMeta();
}

function shiftMode(offset) {
  const currentIndex = Math.max(0, MODES.findIndex(mode => mode.id === state.currentMode.id));
  const nextIndex = (currentIndex + offset + MODES.length) % MODES.length;
  setMode(MODES[nextIndex].id);
  vibrate(HAPTICS.input);
}

function spawnParticles(gx, gy, color) {
  const px = (gx + 0.5) * state.cellSize;
  const py = (gy + 0.5) * state.cellSize;
  let spawned = 0;

  for (const particle of state.particles) {
    if (spawned >= 12) break;
    if (particle.alive) continue;

    const angle = Math.random() * Math.PI * 2;
    const speed = 1.6 + Math.random() * 2.6;

    particle.alive = true;
    particle.x = px;
    particle.y = py;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.alpha = 1;
    particle.size = 2 + Math.random() * 3;
    particle.color = color;
    state.particleCount++;
    spawned++;
  }
}

function updateParticles() {
  for (const particle of state.particles) {
    if (!particle.alive) continue;

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.07;
    particle.alpha *= 0.87;
    particle.size *= 0.965;

    if (particle.alpha < 0.02) {
      particle.alive = false;
      state.particleCount--;
    }
  }
}

function tick() {
  state.dir = state.nextDir;

  const rawNextX = state.snake[0].x + state.dir.x;
  const rawNextY = state.snake[0].y + state.dir.y;
  const hitWall = rawNextX < 0 || rawNextX >= GRID || rawNextY < 0 || rawNextY >= GRID;
  if (!state.currentMode.wrapWalls && hitWall) {
    state.gameOverReason = 'wall';
    endGame();
    return;
  }

  const nextX = ((rawNextX % GRID) + GRID) % GRID;
  const nextY = ((rawNextY % GRID) + GRID) % GRID;
  const nextKey = keyFor(nextX, nextY);

  const tail = state.snake[state.snake.length - 1];
  const tailKey = keyFor(tail.x, tail.y);
  state.snakeSet.delete(tailKey);

  if (state.snakeSet.has(nextKey)) {
    state.snakeSet.add(tailKey);
    state.gameOverReason = 'collision';
    endGame();
    return;
  }

  state.snake.unshift({ x: nextX, y: nextY });
  state.snakeSet.add(nextKey);

  const ateFood = nextX === state.food.x && nextY === state.food.y;
  if (ateFood) {
    state.snakeSet.add(tailKey);
    state.foodEaten += 1;
    const points = Math.round(10 * state.multiplier * state.currentMode.scoreBonus);
    state.score += points;
    state.multiplier = calcMultiplier(state.snake.length, state.currentMode);
    state.maxMultiplier = Math.max(state.maxMultiplier, state.multiplier);
    state.tickInterval = calcInterval(state.snake.length, state.currentMode);
    state.speedLevel = calcSpeedLevel(state.tickInterval, state.currentMode);
    audio.playEat();
    vibrate(HAPTICS.eat);
    spawnParticles(state.food.x, state.food.y, state.currentSkin.food);
    placeFood(state);
  } else {
    state.snake.pop();
  }

  state.distance += DIST_TICK;
  updateHUD();
}

function updateHUD() {
  const bestScore = getModeBestScore();
  const bestDistance = getModeBestDistance();
  const distanceLabel = `${state.distance.toFixed(2)} km`;
  const bestDistanceLabel = bestDistance.toFixed(2);
  const speedDisplay = state.currentMode.timerSeconds
    ? `${Math.ceil(Math.max(state.modeTimeLeft, 0))}s`
    : String(state.speedLevel);

  if (state.score !== state.hudCache.score) {
    EL.hScore.textContent = state.score;
    state.hudCache.score = state.score;
  }

  if (state.multiplier !== state.hudCache.multiplier) {
    EL.hMult.textContent = `${state.multiplier}x`;
    state.hudCache.multiplier = state.multiplier;
  }

  if (distanceLabel !== state.hudCache.distance) {
    EL.hDist.textContent = distanceLabel;
    state.hudCache.distance = distanceLabel;
  }

  if (speedDisplay !== state.hudCache.speedLevel) {
    EL.hSpeed.textContent = speedDisplay;
    state.hudCache.speedLevel = speedDisplay;
  }

  if (bestScore !== state.hudCache.bestScore) {
    EL.hBest.textContent = bestScore;
    state.hudCache.bestScore = bestScore;
  }

  if (bestDistanceLabel !== state.hudCache.bestDistance) {
    EL.hBestdist.textContent = bestDistanceLabel;
    state.hudCache.bestDistance = bestDistanceLabel;
  }
}

function persistRecords() {
  const modeId = state.currentMode.id;
  const bestScore = getModeBestScore();
  const bestDistance = getModeBestDistance();
  const globalBest = LS.getBest();
  const globalBestDistance = LS.getBestDist();

  if (state.score > bestScore) {
    LS.setBest(state.score, modeId);
  }
  if (state.distance > bestDistance) {
    LS.setBestDist(+state.distance.toFixed(3), modeId);
  }
  if (state.score > globalBest) {
    LS.setBest(state.score);
  }
  if (state.distance > globalBestDistance) {
    LS.setBestDist(+state.distance.toFixed(3));
  }

  const run = {
    modeId,
    score: state.score,
    distance: +state.distance.toFixed(3),
    durationSeconds: getRunDurationSeconds(),
    foodEaten: state.foodEaten,
    maxMultiplier: state.maxMultiplier,
  };
  const stats = LS.recordRun(run);
  const unlocked = LS.getAchievements();
  const newAchievements = evaluateAchievements(ACHIEVEMENTS, getAchievementContext(run, stats), unlocked);

  LS.unlockAchievements(newAchievements);

  return { stats, newAchievements };
}

function endGame() {
  state.gameRunning = false;
  document.body.classList.remove('playing');
  audio.stopBGM();
  audio.playGameOverSFX();
  triggerScreenShake();

  const isNewScore = state.score > getModeBestScore();
  const isNewDist = state.distance > getModeBestDistance();
  const progression = persistRecords();
  renderModesPanel();
  renderSkinsPanel();
  renderStatsPanel();
  renderAchievementsPanel();

  setTimeout(() => {
    const achievementLabel = progression.newAchievements.length
      ? ` • ${progression.newAchievements.length} Unlock${progression.newAchievements.length > 1 ? 's' : ''}`
      : '';
    EL.goModeLabel.textContent = `${state.currentMode.name} • ${state.gameOverReason === 'timeout' ? 'Time Up' : 'This Run'}${achievementLabel}`;
    EL.goScore.textContent = state.score;
    EL.goDist.textContent = `${state.distance.toFixed(2)} km`;
    EL.goMult.textContent = `${state.maxMultiplier}x`;
    renderRunAchievements(progression.newAchievements);
    EL.goBest.textContent = getModeBestScore();
    EL.goBestdist.textContent = `${getModeBestDistance().toFixed(2)} km`;
    EL.goBest.classList.toggle('new-best', isNewScore);
    EL.goBestdist.classList.toggle('new-best', isNewDist);
    document.body.classList.add('menu-open');
    EL.goOv.classList.remove('hidden');
    if (progression.newAchievements.length) {
      vibrate(HAPTICS.unlock);
    }
  }, 420);
}

function loop(timestamp) {
  state.rafId = requestAnimationFrame(loop);
  state.foodAnim += 0.07;
  state.headBob += 0.10;

  if (state.particleCount > 0) {
    updateParticles();
  }

  if (state.gameRunning) {
    if (!state.lastFrameTime) {
      state.lastFrameTime = timestamp;
    }
    const frameDelta = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;

    if (state.currentMode.timerSeconds) {
      state.modeTimeLeft = Math.max(0, state.modeTimeLeft - frameDelta / 1000);
      updateHUD();
      if (state.modeTimeLeft <= 0) {
        state.gameOverReason = 'timeout';
        endGame();
        draw();
        return;
      }
    }

    if (!state.lastTickTime) {
      state.lastTickTime = timestamp;
    }

    if (timestamp - state.lastTickTime >= state.tickInterval) {
      state.lastTickTime += state.tickInterval;
      tick();
    }
  }

  draw();
}

function draw() {
  drawScene(ctx, EL.canvas, state);
}

function onKeyDown(event) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    if (!state.gameStarted) {
      startWithCountdown();
    }
    return;
  }

  if (!state.gameRunning) return;

  const nextDirection = KEY_MAP[event.code];
  applyDirection(nextDirection);
}

function onTouchStart(event) {
  if (controlMode !== 'swipe') return;
  event.preventDefault();
  if (!event.touches.length) return;
  startSwipe(event.touches[0].clientX, event.touches[0].clientY);
}

function onTouchEnd(event) {
  if (controlMode !== 'swipe') return;
  event.preventDefault();
  if (!event.changedTouches.length) return;
  finishSwipe(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
}

function onSwipePadPointerDown(event) {
  if (controlMode !== 'swipe') return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  startSwipe(event.clientX, event.clientY);
}

function onSwipePadPointerUp(event) {
  if (controlMode !== 'swipe') return;
  event.preventDefault();
  finishSwipe(event.clientX, event.clientY);
}

function onSwipePadPointerCancel() {
  state.touchX0 = null;
  state.touchY0 = null;
}

function startSwipe(clientX, clientY) {
  state.touchX0 = clientX;
  state.touchY0 = clientY;
}

function finishSwipe(clientX, clientY) {
  if (state.touchX0 == null || state.touchY0 == null) return;

  const dx = clientX - state.touchX0;
  const dy = clientY - state.touchY0;

  state.touchX0 = null;
  state.touchY0 = null;

  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

  if (!state.gameStarted) {
    startWithCountdown();
    return;
  }

  const nextDirection = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
    : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });

  applyDirection(nextDirection);
}

function onControlPointer(event) {
  event.preventDefault();
  const direction = CONTROL_DIRECTIONS[event.currentTarget.dataset.dir];
  if (!state.gameStarted) {
    startWithCountdown();
    if (direction && !(direction.x === -state.dir.x && direction.y === -state.dir.y)) {
      state.nextDir = direction;
    }
    return;
  }
  applyDirection(direction);
}

function applyDirection(nextDirection) {
  if (!nextDirection || !state.gameRunning) return;
  if (!(nextDirection.x === -state.dir.x && nextDirection.y === -state.dir.y)) {
    const changed = nextDirection.x !== state.nextDir.x || nextDirection.y !== state.nextDir.y;
    state.nextDir = nextDirection;
    if (changed) {
      vibrate(HAPTICS.input);
    }
  }
}

function setControlMode(nextMode) {
  controlMode = nextMode === 'keys' ? 'keys' : 'swipe';
  LS.setControlMode(controlMode);
  updateSettingsUI();
  updateMobileControls();
}

function updateSettingsUI() {
  EL.controlModeGroup.querySelectorAll('[data-control-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.controlMode === controlMode);
  });
}

function updateMobileControls() {
  document.body.classList.toggle('keys-enabled', controlMode === 'keys');
  document.body.classList.toggle('swipe-enabled', controlMode === 'swipe');
  EL.mobileControls.classList.remove('hidden');
  updateHomeActionMeta();
}

function updateHomeActionMeta() {
  const stats = getStatsSnapshot();
  const modeStats = stats.modes[state.currentMode.id] || { gamesPlayed: 0 };
  const unlocked = LS.getAchievements();
  const unlockedCount = ACHIEVEMENTS.filter(achievement => unlocked[achievement.id]).length;

  EL.homeSkinsMeta.textContent = `${state.currentSkin.name} active`;
  EL.homeSkinsBtn.style.setProperty('--skin-head', state.currentSkin.head);
  EL.homeSkinsBtn.style.setProperty('--skin-body', state.currentSkin.body);
  EL.homeSkinsBtn.style.setProperty('--skin-tail', state.currentSkin.tail);
  EL.homeSkinsBtn.style.setProperty('--skin-glow', state.currentSkin.glow);
  EL.homeStatsMeta.textContent = `${formatCompactInt(modeStats.gamesPlayed)} ${modeStats.gamesPlayed === 1 ? 'run' : 'runs'}`;
  EL.homeAchievementsMeta.textContent = `${unlockedCount}/${ACHIEVEMENTS.length} unlocked`;
  EL.homeSettingsMeta.textContent = `${controlMode === 'keys' ? 'Keypad' : 'Swipe'} controls`;
}

function renderModesPanel() {
  EL.modesGrid.innerHTML = '';
  const selectedIndex = MODES.findIndex(mode => mode.id === state.currentMode.id);

  MODES.forEach((mode, index) => {
    const selected = mode.id === state.currentMode.id;
    const stackPosition = (index - selectedIndex + MODES.length) % MODES.length;
    const card = document.createElement('button');
    card.className = `mode-card stack-${stackPosition}${selected ? ' selected' : ''}`;
    card.type = 'button';
    card.style.setProperty('--mode-accent', mode.accent);
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');

    const eyebrow = document.createElement('div');
    eyebrow.className = 'mode-eyebrow';
    eyebrow.textContent = selected ? 'Current Mode' : 'Tap to Select';

    const top = document.createElement('div');
    top.className = 'mode-top';

    const name = document.createElement('div');
    name.className = 'mode-name';
    name.textContent = mode.name;
    name.style.color = mode.accent;

    const tag = document.createElement('div');
    tag.className = 'mode-tag';
    tag.textContent = mode.tag;
    tag.style.color = mode.accent;

    top.append(name, tag);

    const desc = document.createElement('div');
    desc.className = 'mode-desc';
    desc.textContent = mode.description;

    const meta = document.createElement('div');
    meta.className = 'mode-meta';

    const chipOne = document.createElement('div');
    chipOne.className = 'mode-chip';
    chipOne.textContent = mode.wrapWalls ? 'Wrap Walls' : 'Solid Walls';

    const chipTwo = document.createElement('div');
    chipTwo.className = 'mode-chip';
    chipTwo.textContent = mode.timerSeconds ? `${mode.timerSeconds}s Timer` : `${mode.scoreBonus}x Score`;

    const chipThree = document.createElement('div');
    chipThree.className = 'mode-chip';
    chipThree.textContent = `${mode.baseTickMs}ms Start`;

    meta.append(chipOne, chipTwo, chipThree);
    card.append(eyebrow, top, desc, meta);
    card.addEventListener('click', event => {
      if (suppressModeCardClick) {
        event.preventDefault();
        return;
      }
      setMode(mode.id);
    });
    EL.modesGrid.appendChild(card);
  });

  const dots = document.createElement('div');
  dots.className = 'mode-stack-dots';
  MODES.forEach(mode => {
    const dot = document.createElement('span');
    dot.className = `mode-stack-dot${mode.id === state.currentMode.id ? ' active' : ''}`;
    dot.style.setProperty('--mode-accent', mode.accent);
    dots.appendChild(dot);
  });
  EL.modesGrid.appendChild(dots);
}

function onModeStackPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;

  modeSwipeX0 = event.clientX;
  modeSwipeY0 = event.clientY;
  EL.modesGrid.setPointerCapture?.(event.pointerId);
}

function onModeStackPointerUp(event) {
  if (modeSwipeX0 == null || modeSwipeY0 == null) return;

  const dx = event.clientX - modeSwipeX0;
  const dy = event.clientY - modeSwipeY0;
  modeSwipeX0 = null;
  modeSwipeY0 = null;

  if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.15) return;

  event.preventDefault();
  suppressModeCardClick = true;
  shiftMode(dx < 0 ? 1 : -1);
  setTimeout(() => {
    suppressModeCardClick = false;
  }, 0);
}

function onModeStackPointerCancel() {
  modeSwipeX0 = null;
  modeSwipeY0 = null;
}

function renderRunAchievements(newAchievements) {
  EL.goAchievements.classList.toggle('hidden', newAchievements.length === 0);
  EL.goAchievementsList.innerHTML = '';

  newAchievements.forEach(achievement => {
    const item = document.createElement('div');
    item.className = 'go-achievement-item';

    const name = document.createElement('div');
    name.className = 'go-achievement-name';
    name.textContent = achievement.name;

    const description = document.createElement('div');
    description.className = 'go-achievement-desc';
    description.textContent = achievement.description;

    item.append(name, description);
    EL.goAchievementsList.appendChild(item);
  });
}

function renderSkinsPanel() {
  EL.skinsGrid.innerHTML = '';
  const unlockedCount = SKINS.filter(skin => skin.cond()).length;
  EL.skinsSummary.textContent = `${state.currentSkin.name} active • ${unlockedCount}/${SKINS.length} skins unlocked`;

  SKINS.forEach(skin => {
    const unlocked = skin.cond();
    const selected = skin.id === state.currentSkin.id;
    const card = document.createElement('div');
    card.className = `skin-card${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}`;

    const preview = document.createElement('canvas');
    preview.className = 'skin-preview';
    preview.width = 26;
    preview.height = 26;

    const previewCtx = preview.getContext('2d');
    previewCtx.fillStyle = skin.tail;
    previewCtx.fillRect(0, 0, 26, 26);
    previewCtx.fillStyle = skin.body;
    previewCtx.fillRect(0, 0, 18, 26);
    previewCtx.shadowColor = skin.glow;
    previewCtx.shadowBlur = 5;
    previewCtx.fillStyle = skin.head;
    previewCtx.fillRect(0, 0, 11, 26);
    previewCtx.shadowBlur = 0;

    const info = document.createElement('div');
    info.className = 'skin-info';

    const name = document.createElement('div');
    name.className = 'skin-name';
    name.style.color = skin.head;
    name.textContent = skin.name;

    const cond = document.createElement('div');
    cond.className = 'skin-cond';
    cond.textContent = skin.unlock;

    info.append(name, cond);

    const badge = document.createElement('div');
    badge.className = `skin-badge${unlocked ? '' : ' locked'}`;
    badge.textContent = unlocked ? (selected ? 'ON' : 'USE') : 'LOCK';

    card.append(preview, info, badge);
    if (unlocked) {
      card.addEventListener('click', () => {
        state.currentSkin = skin;
        LS.setSkin(skin.id);
        renderSkinsPanel();
        updateHomeActionMeta();
      });
    }

    EL.skinsGrid.appendChild(card);
  });
  updateHomeActionMeta();
}

function renderStatsPanel() {
  const stats = getStatsSnapshot();
  const lifetime = stats.lifetime;
  const modeStats = stats.modes[state.currentMode.id] || {
    gamesPlayed: 0,
    foodEaten: 0,
    totalDistance: 0,
    totalScore: 0,
    totalSeconds: 0,
    bestMultiplier: 1,
    bestDuration: 0,
    lastScore: 0,
    lastDistance: 0,
    lastDuration: 0,
  };

  const cards = [
    { label: 'Runs', value: formatCompactInt(modeStats.gamesPlayed), tone: 'gold' },
    { label: 'Food', value: formatCompactInt(modeStats.foodEaten), tone: 'green' },
    { label: 'Best Multi', value: `${modeStats.bestMultiplier}x`, tone: 'pink' },
    { label: 'Mode Time', value: formatSeconds(modeStats.totalSeconds), tone: '' },
    { label: 'Lifetime Runs', value: formatCompactInt(lifetime.gamesPlayed), tone: 'gold' },
    { label: 'Lifetime Km', value: `${lifetime.totalDistance.toFixed(1)} km`, tone: 'green' },
  ];

  EL.statsGrid.innerHTML = '';
  cards.forEach(card => {
    const panel = document.createElement('div');
    panel.className = 'stat-card';

    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = card.label;

    const value = document.createElement('div');
    value.className = `stat-value${card.tone ? ` ${card.tone}` : ''}`;
    value.textContent = card.value;

    panel.append(label, value);
    EL.statsGrid.appendChild(panel);
  });
  updateHomeActionMeta();
}

function renderAchievementsPanel() {
  syncAchievements();
  const context = getAchievementContext();
  const unlocked = LS.getAchievements();
  const unlockedCount = ACHIEVEMENTS.filter(achievement => unlocked[achievement.id]).length;
  EL.achievementsSummary.textContent = `${unlockedCount}/${ACHIEVEMENTS.length} unlocked`;
  EL.achievementsList.innerHTML = '';

  ACHIEVEMENTS.forEach(achievement => {
    const isUnlocked = Boolean(unlocked[achievement.id]);
    const progressData = achievement.progress(context);
    const progressPercent = Math.round(progressData.ratio * 100);
    const card = document.createElement('div');
    card.className = `achievement-card${isUnlocked ? ' unlocked' : ''}`;

    const medal = document.createElement('div');
    medal.className = 'achievement-medal';
    medal.textContent = achievement.badge;

    const status = document.createElement('div');
    status.className = 'achievement-state';

    const content = document.createElement('div');
    content.className = 'achievement-content';

    const name = document.createElement('div');
    name.className = 'achievement-name';
    name.textContent = achievement.name;

    const description = document.createElement('div');
    description.className = 'achievement-desc';
    description.textContent = achievement.description;

    const meta = document.createElement('div');
    meta.className = 'achievement-meta';
    meta.textContent = `${achievement.category} • ${formatProgress(progressData)}`;

    const progressTrack = document.createElement('div');
    progressTrack.className = 'achievement-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'achievement-progress-bar';
    progressBar.style.width = `${progressPercent}%`;
    progressTrack.appendChild(progressBar);

    content.append(name, description, meta, progressTrack);
    card.append(medal, content, status);
    EL.achievementsList.appendChild(card);
  });
  updateHomeActionMeta();
}

function showHomePanel(panelId) {
  if (activeHomePanel === panelId) {
    closeHomeModal();
    return;
  }

  activeHomePanel = panelId;
  EL.homeModal.classList.remove('hidden');

  Object.entries(HOME_PANELS).forEach(([id, config]) => {
    config.panel().classList.toggle('hidden', id !== panelId);
    config.button().classList.toggle('active', id === panelId);
  });

  EL.homeModalTitle.textContent = panelId === 'stats'
    ? `${state.currentMode.name} Stats`
    : HOME_PANELS[panelId].title;

  if (panelId === 'stats') {
    renderStatsPanel();
  }
  if (panelId === 'skins') {
    renderSkinsPanel();
  }
  if (panelId === 'achievements') {
    renderAchievementsPanel();
  }
  if (panelId === 'settings') {
    updateSettingsUI();
  }
}

function closeHomeModal() {
  activeHomePanel = null;
  EL.homeModal.classList.add('hidden');

  Object.values(HOME_PANELS).forEach(config => {
    config.panel().classList.add('hidden');
    config.button().classList.remove('active');
  });
}

function showStartScreen() {
  state.gameStarted = false;
  state.gameRunning = false;
  audio.stopBGM();
  document.body.classList.remove('playing');
  document.body.classList.add('menu-open');
  EL.startOv.classList.remove('hidden');
  EL.goOv.classList.add('hidden');
  updateModeUI();
  renderModesPanel();
  renderSkinsPanel();
  renderStatsPanel();
  renderAchievementsPanel();
  closeHomeModal();
  resetGame();
}

function startWithCountdown() {
  if (state.gameStarted) return;

  state.gameStarted = true;
  audio.ensureAudio();
  document.body.classList.add('playing');
  document.body.classList.remove('menu-open');
  EL.startOv.classList.add('hidden');
  resetGame();
  runCountdown();
}

function runCountdown() {
  const steps = ['3', '2', '1', 'GO!'];
  let index = 0;
  EL.cdWrap.style.display = 'flex';

  function showStep() {
    if (index >= steps.length) {
      EL.cdWrap.style.display = 'none';
      state.lastTickTime = 0;
      state.lastFrameTime = 0;
      state.gameRunning = true;
      audio.startBGM();
      vibrate(HAPTICS.countdownGo);
      return;
    }

    const isGo = steps[index] === 'GO!';
    audio.playCountdownTick(isGo);

    const countdownEl = EL.cdNum;
    countdownEl.style.transition = 'none';
    countdownEl.style.opacity = '0';
    countdownEl.style.transform = 'scale(0.35)';
    countdownEl.style.color = isGo ? 'var(--green)' : 'var(--cyan)';
    countdownEl.style.textShadow = isGo
      ? '0 0 26px var(--green), 0 0 52px rgba(0,255,136,0.32)'
      : '0 0 26px var(--cyan),  0 0 52px rgba(0,234,255,0.32)';
    countdownEl.textContent = steps[index];

    requestAnimationFrame(() => requestAnimationFrame(() => {
      countdownEl.style.transition = 'opacity .13s ease, transform .20s cubic-bezier(.17,.89,.32,1.28)';
      countdownEl.style.opacity = '1';
      countdownEl.style.transform = 'scale(1)';
    }));

    index++;
    setTimeout(showStep, isGo ? 460 : 840);
  }

  showStep();
}

function init() {
  state.currentSkin = SKINS.find(skin => skin.id === LS.getSkin()) || SKINS[0];
  state.currentMode = MODES.find(mode => mode.id === LS.getMode()) || MODES[0];
  EL.appVersion.textContent = APP_VERSION;

  resize();
  updateModeUI();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  EL.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  EL.canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  EL.mobileControls.addEventListener('pointerdown', onSwipePadPointerDown);
  EL.mobileControls.addEventListener('pointerup', onSwipePadPointerUp);
  EL.mobileControls.addEventListener('pointercancel', onSwipePadPointerCancel);
  EL.modesGrid.addEventListener('pointerdown', onModeStackPointerDown);
  EL.modesGrid.addEventListener('pointerup', onModeStackPointerUp);
  EL.modesGrid.addEventListener('pointercancel', onModeStackPointerCancel);

  EL.startBtn.addEventListener('click', startWithCountdown);
  EL.modePrevBtn.addEventListener('click', () => shiftMode(-1));
  EL.modeNextBtn.addEventListener('click', () => shiftMode(1));
  EL.homeHowBtn.addEventListener('click', () => showHomePanel('how'));
  EL.homeSkinsBtn.addEventListener('click', () => showHomePanel('skins'));
  EL.homeStatsBtn.addEventListener('click', () => showHomePanel('stats'));
  EL.homeAchievementsBtn.addEventListener('click', () => showHomePanel('achievements'));
  EL.homeSettingsBtn.addEventListener('click', () => showHomePanel('settings'));
  EL.homeModalClose.addEventListener('click', closeHomeModal);
  EL.homeModal.addEventListener('click', event => {
    if (event.target === EL.homeModal) closeHomeModal();
  });
  EL.controlModeGroup.querySelectorAll('[data-control-mode]').forEach(button => {
    button.addEventListener('click', () => setControlMode(button.dataset.controlMode));
  });
  EL.mobileControls.querySelectorAll('[data-dir]').forEach(button => {
    button.addEventListener('pointerdown', onControlPointer);
  });

  EL.restartBtn.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    EL.goOv.classList.add('hidden');
    state.gameStarted = false;
    startWithCountdown();
  });

  EL.homeBtn.addEventListener('click', () => {
    EL.goOv.classList.add('hidden');
    showStartScreen();
  });

  showStartScreen();
  updateSettingsUI();
  updateMobileControls();
  registerServiceWorker();
  state.rafId = requestAnimationFrame(loop);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The game still runs normally if install/offline support is unavailable.
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

function getRunDurationSeconds() {
  const modeDuration = state.currentMode.timerSeconds;
  if (modeDuration) {
    return +(modeDuration - state.modeTimeLeft).toFixed(1);
  }

  const baseTick = state.currentMode.baseTickMs || BASE_MS;
  return +((state.distance / DIST_TICK) * baseTick / 1000).toFixed(1);
}

function formatCompactInt(value) {
  return new Intl.NumberFormat('en-US', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function formatSeconds(value) {
  if (!value) return '0:00';
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatProgress(progressData) {
  return `${formatProgressValue(progressData.current)}/${formatProgressValue(progressData.target)}`;
}

function formatProgressValue(value) {
  if (value >= 1000) return formatCompactInt(Math.round(value));
  if (value % 1 !== 0) return value.toFixed(1);
  return String(Math.round(value));
}
