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
import { createSeededRandom, getDailyChallenge, isDailyMode } from './data/daily-challenge.js';
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

const SHARE_CARD = {
  width: 1080,
  height: 1920,
  url: 'https://manojrautaray.github.io/Snake-Master/',
  urlLabel: 'manojrautaray.github.io/Snake-Master',
  fileName: 'snake-master-score.png',
};

let activeHomePanel = null;
let controlMode = LS.getControlMode();
let modeSwipeX0 = null;
let modeSwipeY0 = null;
let suppressModeCardClick = false;
let lastShareRun = null;
let shareStatusTimer = null;

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
  prepareRunRandomness();
  resetGameState(state);
  placeFood(state);
  resetHudCache(state.hudCache);
  updateHUD();
}

function getModeBestScore() {
  if (isDailyMode(state.currentMode)) {
    return getCurrentDailySummary().bestScore;
  }

  return LS.getBest(state.currentMode.id);
}

function getModeBestDistance() {
  if (isDailyMode(state.currentMode)) {
    return getCurrentDailySummary().bestDistance;
  }

  return LS.getBestDist(state.currentMode.id);
}

function prepareRunRandomness() {
  const challenge = getCurrentDailyChallenge();
  state.dailyChallenge = challenge;
  state.random = challenge ? createSeededRandom(challenge.seed) : Math.random;
}

function getCurrentDailyChallenge() {
  return isDailyMode(state.currentMode) ? getDailyChallenge() : null;
}

function getCurrentDailySummary(challenge = state.dailyChallenge || getCurrentDailyChallenge()) {
  if (!challenge) {
    return LS.getDailySummary('');
  }

  return LS.getDailySummary(challenge.dateKey);
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
  const modeDisplay = getModeDisplay(state.currentMode);
  EL.hSpeedLabel.textContent = isTimedMode ? 'Time' : 'Speed';
  EL.goBestHeader.textContent = modeDisplay.bestHeader;
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
  const modeRecordScore = LS.getBest(modeId);
  const modeRecordDistance = LS.getBestDist(modeId);
  const globalBest = LS.getBest();
  const globalBestDistance = LS.getBestDist();

  if (state.score > modeRecordScore) {
    LS.setBest(state.score, modeId);
  }
  if (state.distance > modeRecordDistance) {
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
    dailyChallenge: state.dailyChallenge ? { ...state.dailyChallenge } : null,
  };
  const stats = LS.recordRun(run);
  const dailySummary = run.dailyChallenge
    ? LS.recordDailyRun({
      dateKey: run.dailyChallenge.dateKey,
      score: run.score,
      distance: run.distance,
      durationSeconds: run.durationSeconds,
    })
    : null;
  const unlocked = LS.getAchievements();
  const newAchievements = evaluateAchievements(ACHIEVEMENTS, getAchievementContext(run, stats), unlocked);

  LS.unlockAchievements(newAchievements);
  LS.addPendingAchievementCount(newAchievements.length);

  return { stats, newAchievements, run, dailySummary };
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
  updateHomeActionMeta();

  setTimeout(() => {
    renderRunReport(progression, isNewScore, isNewDist);
    renderRunAchievementSummary(progression.newAchievements);
    document.body.classList.add('menu-open');
    EL.goOv.classList.remove('hidden');
    if (progression.newAchievements.length) {
      vibrate(HAPTICS.unlock);
    }
  }, 420);
}

function renderRunReport(progression, isNewScore, isNewDist) {
  const run = progression.run;
  const accent = state.currentMode.accent;
  const modeDisplay = getModeDisplay(state.currentMode, run.dailyChallenge);

  EL.goOv.style.setProperty('--report-accent', accent);
  EL.goOv.style.setProperty('--report-accent-rgb', hexToRgb(accent));
  EL.goModeLabel.textContent = state.currentMode.name;
  EL.goOutcome.textContent = getGameOverOutcome();
  EL.goModeChip.textContent = modeDisplay.tag;
  EL.goBestHeader.textContent = modeDisplay.bestHeader;
  EL.goScore.textContent = run.score;
  EL.goDist.textContent = `${run.distance.toFixed(2)} km`;
  EL.goMult.textContent = `${run.maxMultiplier}x`;
  EL.goFood.textContent = run.foodEaten;
  EL.goTime.textContent = formatSeconds(run.durationSeconds);
  EL.goPaceLabel.textContent = state.currentMode.timerSeconds ? 'Clock' : 'Speed';
  EL.goPace.textContent = state.currentMode.timerSeconds
    ? `${Math.ceil(Math.max(0, state.modeTimeLeft))}s`
    : state.speedLevel;
  EL.goSkinName.textContent = state.currentSkin.name;
  EL.goSkinSwatch.style.background = `linear-gradient(90deg, ${state.currentSkin.tail}, ${state.currentSkin.body}, ${state.currentSkin.head})`;
  EL.goSkinSwatch.style.boxShadow = `0 0 14px ${state.currentSkin.glow}`;
  EL.goBest.textContent = getModeBestScore();
  EL.goBestdist.textContent = `${getModeBestDistance().toFixed(2)} km`;
  EL.goBest.classList.toggle('new-best', isNewScore);
  EL.goBestdist.classList.toggle('new-best', isNewDist);
  EL.goBestScoreTag.classList.toggle('hidden', !isNewScore);
  EL.goBestDistTag.classList.toggle('hidden', !isNewDist);
  EL.goShareStatus.classList.add('hidden');
  lastShareRun = buildShareRun(run, progression.newAchievements.length);
  renderNewBestSummary(isNewScore, isNewDist);
}

function renderNewBestSummary(isNewScore, isNewDist) {
  const labels = [];
  if (isNewScore) labels.push('New score best');
  if (isNewDist) labels.push('New distance best');

  EL.goNewBests.classList.toggle('hidden', labels.length === 0);
  EL.goNewBests.textContent = labels.join(' • ');
}

function getGameOverOutcome() {
  if (state.gameOverReason === 'timeout') return 'Time Up';
  if (state.gameOverReason === 'wall') return 'Wall Crash';
  return 'Snake Collision';
}

function buildShareRun(run, achievementCount) {
  const modeDisplay = getModeDisplay(state.currentMode, run.dailyChallenge);
  const paceLabel = state.currentMode.timerSeconds ? 'Clock' : 'Speed';
  const paceValue = state.currentMode.timerSeconds
    ? `${Math.ceil(Math.max(0, state.modeTimeLeft))}s`
    : state.speedLevel;

  return {
    title: 'Snake Master',
    score: run.score,
    distance: run.distance,
    foodEaten: run.foodEaten,
    maxMultiplier: run.maxMultiplier,
    durationSeconds: run.durationSeconds,
    achievementCount,
    outcome: getGameOverOutcome(),
    modeName: state.currentMode.name,
    modeTag: modeDisplay.tag,
    modeAccent: state.currentMode.accent,
    challengeLabel: run.dailyChallenge?.label || '',
    challengeDate: run.dailyChallenge?.dateKey || '',
    skinName: state.currentSkin.name,
    skinHead: state.currentSkin.head,
    skinBody: state.currentSkin.body,
    skinTail: state.currentSkin.tail,
    skinGlow: state.currentSkin.glow,
    foodColor: state.currentSkin.food,
    paceLabel,
    paceValue,
    text: [
      `I scored ${formatCompactInt(run.score)} in Snake Master ${run.dailyChallenge?.label || state.currentMode.name}.`,
      `Distance: ${run.distance.toFixed(2)} km | Food: ${run.foodEaten} | Multi: ${run.maxMultiplier}x`,
      `Skin: ${state.currentSkin.name}`,
    ].join('\n'),
    url: SHARE_CARD.url,
  };
}

async function shareRunScore() {
  if (!lastShareRun) return;

  showShareStatus('Preparing score card', '', 0);

  let imageFile;
  try {
    imageFile = await createShareCardFile(lastShareRun);
  } catch (_) {
    const copied = await copyToClipboard(getShareText(lastShareRun));
    showShareStatus(copied ? 'Score text copied' : 'Share unavailable', copied ? '' : 'error');
    return;
  }

  if (navigator.share && canShareFiles([imageFile])) {
    try {
      await navigator.share({
        title: lastShareRun.title,
        text: lastShareRun.text,
        url: lastShareRun.url,
        files: [imageFile],
      });
      showShareStatus('Score card shared');
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        showShareStatus('Share cancelled');
        return;
      }
    }
  }

  try {
    if (await copyImageToClipboard(imageFile)) {
      showShareStatus('Score card copied');
      return;
    }

    if (navigator.share) {
      await navigator.share(getTextSharePayload(lastShareRun));
      showShareStatus('Shared text');
      return;
    }

    const copied = await copyToClipboard(getShareText(lastShareRun));
    showShareStatus(copied ? 'Score text copied' : 'Share unavailable', copied ? '' : 'error');
  } catch (error) {
    if (error?.name === 'AbortError') {
      showShareStatus('Share cancelled');
      return;
    }

    const copied = await copyToClipboard(getShareText(lastShareRun));
    showShareStatus(copied ? 'Score text copied' : 'Share unavailable', copied ? '' : 'error');
  }
}

function canShareFiles(files) {
  try {
    return Boolean(navigator.canShare?.({ files }));
  } catch (_) {
    return false;
  }
}

function getTextSharePayload(shareRun) {
  return {
    title: shareRun.title,
    text: shareRun.text,
    url: shareRun.url,
  };
}

function getShareText(shareRun) {
  return `${shareRun.text}\nPlay: ${shareRun.url}`;
}

async function createShareCardFile(shareRun) {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD.width;
  canvas.height = SHARE_CARD.height;
  const shareCtx = canvas.getContext('2d');

  drawShareCard(shareCtx, shareRun);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Unable to create score card image.');
  }

  return new File([blob], SHARE_CARD.fileName, { type: 'image/png' });
}

async function copyImageToClipboard(file) {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return false;

    await navigator.clipboard.write([
      new ClipboardItem({ [file.type]: file }),
    ]);
    return true;
  } catch (_) {
    return false;
  }
}

function drawShareCard(shareCtx, shareRun) {
  const { width, height } = SHARE_CARD;
  const accent = shareRun.modeAccent;
  const accentRgb = hexToRgb(accent);

  shareCtx.clearRect(0, 0, width, height);
  drawShareBackground(shareCtx, width, height, accentRgb);
  drawShareMainCard(shareCtx, accentRgb);
  drawShareHeader(shareCtx, shareRun);
  drawShareScore(shareCtx, shareRun);
  drawShareStats(shareCtx, shareRun);
  drawShareSnakePreview(shareCtx, shareRun);
  drawShareFooter(shareCtx, shareRun);
}

function drawShareBackground(shareCtx, width, height, accentRgb) {
  const bg = shareCtx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#030711');
  bg.addColorStop(0.55, '#06172b');
  bg.addColorStop(1, '#140416');
  shareCtx.fillStyle = bg;
  shareCtx.fillRect(0, 0, width, height);

  drawShareGlow(shareCtx, 110, 120, 420, '0,234,255', 0.22);
  drawShareGlow(shareCtx, width - 70, height - 120, 520, '255,45,120', 0.20);
  drawShareGlow(shareCtx, width * 0.62, height * 0.36, 430, accentRgb, 0.12);

  shareCtx.save();
  shareCtx.strokeStyle = 'rgba(0,234,255,.075)';
  shareCtx.lineWidth = 1;
  for (let x = -40; x < width + 40; x += 64) {
    shareCtx.beginPath();
    shareCtx.moveTo(x, 0);
    shareCtx.lineTo(x + 170, height);
    shareCtx.stroke();
  }
  for (let y = 0; y < height; y += 64) {
    shareCtx.beginPath();
    shareCtx.moveTo(0, y);
    shareCtx.lineTo(width, y);
    shareCtx.stroke();
  }
  shareCtx.restore();
}

function drawShareMainCard(shareCtx, accentRgb) {
  const card = { x: 76, y: 82, w: 928, h: 1756, r: 58 };
  const fill = shareCtx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
  fill.addColorStop(0, 'rgba(7,28,48,.92)');
  fill.addColorStop(0.55, 'rgba(3,10,24,.96)');
  fill.addColorStop(1, 'rgba(12,6,26,.94)');

  roundedRectPath(shareCtx, card.x, card.y, card.w, card.h, card.r);
  shareCtx.fillStyle = fill;
  shareCtx.fill();
  shareCtx.lineWidth = 3;
  shareCtx.strokeStyle = `rgba(${accentRgb},.46)`;
  shareCtx.shadowColor = `rgba(${accentRgb},.40)`;
  shareCtx.shadowBlur = 32;
  shareCtx.stroke();
  shareCtx.shadowBlur = 0;

  roundedRectPath(shareCtx, card.x + 22, card.y + 22, card.w - 44, card.h - 44, 44);
  shareCtx.strokeStyle = 'rgba(0,234,255,.12)';
  shareCtx.lineWidth = 1.4;
  shareCtx.stroke();
}

function drawShareHeader(shareCtx, shareRun) {
  const titleGradient = shareCtx.createLinearGradient(260, 0, 820, 0);
  titleGradient.addColorStop(0, '#00eaff');
  titleGradient.addColorStop(1, '#00ff88');

  shareCtx.save();
  shareCtx.shadowColor = 'rgba(0,234,255,.55)';
  shareCtx.shadowBlur = 20;
  shareCtx.fillStyle = titleGradient;
  shareCtx.font = '900 72px Orbitron, Rajdhani, sans-serif';
  drawTrackingText(shareCtx, 'SNAKE MASTER', 540, 190, 7, 'center');
  shareCtx.restore();

  shareCtx.fillStyle = 'rgba(180,220,255,.54)';
  shareCtx.font = '500 25px Rajdhani, sans-serif';
  drawTrackingText(shareCtx, 'NEON EDITION', 540, 244, 12, 'center');

  drawPill(shareCtx, 434, 278, 212, 44, '#001624', 'rgba(0,234,255,.35)');
  shareCtx.fillStyle = 'rgba(0,234,255,.88)';
  shareCtx.font = '700 20px Orbitron, sans-serif';
  shareCtx.textAlign = 'center';
  shareCtx.fillText(APP_VERSION, 540, 307);

  shareCtx.fillStyle = shareRun.modeAccent;
  shareCtx.font = '900 56px Orbitron, sans-serif';
  shareCtx.shadowColor = shareRun.modeAccent;
  shareCtx.shadowBlur = 18;
  drawTrackingText(shareCtx, 'GAME OVER', 540, 430, 7, 'center');
  shareCtx.shadowBlur = 0;

  drawPill(shareCtx, 326, 475, 428, 64, `rgba(${hexToRgb(shareRun.modeAccent)},.13)`, `rgba(${hexToRgb(shareRun.modeAccent)},.48)`);
  shareCtx.fillStyle = shareRun.modeAccent;
  setFittedFont(shareCtx, shareRun.modeName.toUpperCase(), 340, 25, 17, '700', 'Orbitron, sans-serif');
  drawTrackingText(shareCtx, shareRun.modeName.toUpperCase(), 540, 516, 2.2, 'center');

  if (shareRun.challengeLabel) {
    drawPill(shareCtx, 352, 552, 376, 42, 'rgba(182,255,74,.08)', 'rgba(182,255,74,.30)');
    shareCtx.fillStyle = '#b6ff4a';
    shareCtx.font = '700 18px Orbitron, sans-serif';
    drawTrackingText(shareCtx, shareRun.challengeLabel.toUpperCase(), 540, 579, 1.4, 'center');
  }
}

function drawShareScore(shareCtx, shareRun) {
  shareCtx.fillStyle = 'rgba(180,220,255,.48)';
  shareCtx.font = '700 22px Orbitron, sans-serif';
  drawTrackingText(shareCtx, 'FINAL SCORE', 540, 630, 4, 'center');

  const scoreText = String(shareRun.score);
  setFittedFont(shareCtx, scoreText, 760, 178, 100, '900', 'Orbitron, Rajdhani, sans-serif');
  const scoreGradient = shareCtx.createLinearGradient(260, 650, 820, 760);
  scoreGradient.addColorStop(0, '#fff45e');
  scoreGradient.addColorStop(0.5, '#ffd700');
  scoreGradient.addColorStop(1, '#ff8f1c');
  shareCtx.fillStyle = scoreGradient;
  shareCtx.textAlign = 'center';
  shareCtx.shadowColor = 'rgba(255,215,0,.62)';
  shareCtx.shadowBlur = 30;
  shareCtx.fillText(scoreText, 540, 780);
  shareCtx.shadowBlur = 0;

  if (shareRun.achievementCount > 0) {
    drawPill(shareCtx, 360, 826, 360, 54, 'rgba(255,215,0,.12)', 'rgba(255,215,0,.38)');
    shareCtx.fillStyle = '#ffd700';
    shareCtx.font = '700 20px Orbitron, sans-serif';
    drawTrackingText(shareCtx, `+${shareRun.achievementCount} ACHIEVEMENTS`, 540, 860, 2.5, 'center');
  }
}

function drawShareStats(shareCtx, shareRun) {
  const stats = [
    ['DISTANCE', `${shareRun.distance.toFixed(2)} KM`, '#00ff88'],
    ['FOOD', String(shareRun.foodEaten), shareRun.foodColor],
    ['MULTI', `${shareRun.maxMultiplier}X`, '#ff2d78'],
    ['TIME', formatSeconds(shareRun.durationSeconds), '#00eaff'],
  ];
  const startX = 134;
  const y = 940;
  const w = 184;
  const h = 128;
  const gap = 28;

  stats.forEach(([label, value, tone], index) => {
    const x = startX + index * (w + gap);
    roundedRectPath(shareCtx, x, y, w, h, 24);
    shareCtx.fillStyle = 'rgba(0,12,28,.66)';
    shareCtx.fill();
    shareCtx.strokeStyle = `rgba(${colorToRgbString(tone)},.28)`;
    shareCtx.lineWidth = 1.8;
    shareCtx.stroke();

    shareCtx.fillStyle = 'rgba(180,220,255,.43)';
    shareCtx.font = '700 17px Orbitron, sans-serif';
    drawTrackingText(shareCtx, label, x + w / 2, y + 42, 2, 'center');

    shareCtx.fillStyle = tone;
    shareCtx.font = '900 30px Orbitron, sans-serif';
    shareCtx.textAlign = 'center';
    shareCtx.shadowColor = tone;
    shareCtx.shadowBlur = 10;
    shareCtx.fillText(value, x + w / 2, y + 88);
    shareCtx.shadowBlur = 0;
  });
}

function drawShareSnakePreview(shareCtx, shareRun) {
  const board = { x: 168, y: 1130, w: 744, h: 310, r: 34 };
  roundedRectPath(shareCtx, board.x, board.y, board.w, board.h, board.r);
  shareCtx.fillStyle = 'rgba(2,10,22,.72)';
  shareCtx.fill();
  shareCtx.strokeStyle = 'rgba(0,234,255,.24)';
  shareCtx.lineWidth = 2;
  shareCtx.stroke();

  shareCtx.save();
  shareCtx.beginPath();
  roundedRectPath(shareCtx, board.x, board.y, board.w, board.h, board.r);
  shareCtx.clip();
  shareCtx.strokeStyle = 'rgba(0,234,255,.10)';
  shareCtx.lineWidth = 1;
  for (let x = board.x + 30; x < board.x + board.w; x += 48) {
    shareCtx.beginPath();
    shareCtx.moveTo(x, board.y);
    shareCtx.lineTo(x, board.y + board.h);
    shareCtx.stroke();
  }
  for (let y = board.y + 28; y < board.y + board.h; y += 48) {
    shareCtx.beginPath();
    shareCtx.moveTo(board.x, y);
    shareCtx.lineTo(board.x + board.w, y);
    shareCtx.stroke();
  }
  shareCtx.restore();

  const cell = 56;
  const snake = [
    [292, 1258, shareRun.skinTail],
    [350, 1258, shareRun.skinBody],
    [408, 1258, shareRun.skinBody],
    [466, 1258, shareRun.skinHead],
    [466, 1316, shareRun.skinHead],
  ];

  shareCtx.shadowColor = shareRun.skinGlow;
  shareCtx.shadowBlur = 28;
  snake.forEach(([x, y, color]) => {
    roundedRectPath(shareCtx, x, y, cell, cell, 10);
    shareCtx.fillStyle = color;
    shareCtx.fill();
  });
  shareCtx.shadowBlur = 0;

  shareCtx.fillStyle = '#04101a';
  shareCtx.beginPath();
  shareCtx.arc(505, 1281, 5, 0, Math.PI * 2);
  shareCtx.arc(505, 1311, 5, 0, Math.PI * 2);
  shareCtx.fill();

  shareCtx.shadowColor = shareRun.foodColor;
  shareCtx.shadowBlur = 26;
  shareCtx.fillStyle = shareRun.foodColor;
  roundedRectPath(shareCtx, 664, 1260, 50, 50, 12);
  shareCtx.fill();
  shareCtx.shadowBlur = 0;

  shareCtx.fillStyle = 'rgba(180,220,255,.42)';
  shareCtx.font = '700 18px Orbitron, sans-serif';
  drawTrackingText(shareCtx, `${shareRun.skinName.toUpperCase()} SKIN`, 540, 1400, 2.6, 'center');
}

function drawShareFooter(shareCtx, shareRun) {
  shareCtx.fillStyle = '#00ff88';
  shareCtx.font = '900 34px Orbitron, sans-serif';
  shareCtx.shadowColor = 'rgba(0,255,136,.55)';
  shareCtx.shadowBlur = 14;
  drawTrackingText(shareCtx, 'CAN YOU BEAT THIS RUN?', 540, 1535, 3.2, 'center');
  shareCtx.shadowBlur = 0;

  drawPill(shareCtx, 172, 1596, 596, 74, 'rgba(0,234,255,.075)', 'rgba(0,234,255,.24)');
  shareCtx.fillStyle = '#d9f4ff';
  shareCtx.font = '600 29px Rajdhani, sans-serif';
  shareCtx.textAlign = 'center';
  shareCtx.fillText(SHARE_CARD.urlLabel, 470, 1643);

  drawPseudoQr(shareCtx, 792, 1576, 122, shareRun.modeAccent);

  shareCtx.fillStyle = 'rgba(180,220,255,.34)';
  shareCtx.font = '500 22px Rajdhani, sans-serif';
  shareCtx.textAlign = 'center';
  shareCtx.fillText(`${shareRun.outcome} | ${shareRun.modeTag}`, 540, 1738);
}

function drawShareGlow(shareCtx, x, y, radius, rgb, opacity) {
  const gradient = shareCtx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb},${opacity})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  shareCtx.fillStyle = gradient;
  shareCtx.beginPath();
  shareCtx.arc(x, y, radius, 0, Math.PI * 2);
  shareCtx.fill();
}

function drawPill(shareCtx, x, y, width, height, fill, stroke) {
  roundedRectPath(shareCtx, x, y, width, height, height / 2);
  shareCtx.fillStyle = fill;
  shareCtx.fill();
  shareCtx.strokeStyle = stroke;
  shareCtx.lineWidth = 2;
  shareCtx.stroke();
}

function drawPseudoQr(shareCtx, x, y, size, accent) {
  roundedRectPath(shareCtx, x, y, size, size, 18);
  shareCtx.fillStyle = 'rgba(0,8,22,.72)';
  shareCtx.fill();
  shareCtx.strokeStyle = 'rgba(180,220,255,.16)';
  shareCtx.stroke();

  const cells = 7;
  const gap = 4;
  const cell = (size - 28 - gap * (cells - 1)) / cells;
  const active = new Set([0, 1, 2, 4, 6, 8, 10, 13, 14, 17, 20, 22, 24, 25, 28, 31, 34, 36, 38, 39, 41, 44, 46, 47, 48]);
  for (let i = 0; i < cells * cells; i++) {
    if (!active.has(i)) continue;
    const col = i % cells;
    const row = Math.floor(i / cells);
    roundedRectPath(shareCtx, x + 14 + col * (cell + gap), y + 14 + row * (cell + gap), cell, cell, 3);
    shareCtx.fillStyle = i % 3 === 0 ? accent : '#00eaff';
    shareCtx.globalAlpha = i % 5 === 0 ? .55 : .90;
    shareCtx.fill();
  }
  shareCtx.globalAlpha = 1;
}

function roundedRectPath(shareCtx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  shareCtx.beginPath();
  shareCtx.moveTo(x + r, y);
  shareCtx.lineTo(x + width - r, y);
  shareCtx.quadraticCurveTo(x + width, y, x + width, y + r);
  shareCtx.lineTo(x + width, y + height - r);
  shareCtx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shareCtx.lineTo(x + r, y + height);
  shareCtx.quadraticCurveTo(x, y + height, x, y + height - r);
  shareCtx.lineTo(x, y + r);
  shareCtx.quadraticCurveTo(x, y, x + r, y);
  shareCtx.closePath();
}

function drawTrackingText(shareCtx, text, x, y, tracking, align = 'left') {
  shareCtx.textAlign = 'left';
  const chars = [...text];
  const widths = chars.map(char => shareCtx.measureText(char).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + tracking * (chars.length - 1);
  let cursor = align === 'center' ? x - totalWidth / 2 : x;

  chars.forEach((char, index) => {
    shareCtx.fillText(char, cursor, y);
    cursor += widths[index] + tracking;
  });
}

function setFittedFont(shareCtx, text, maxWidth, startSize, minSize, weight, family) {
  let size = startSize;
  do {
    shareCtx.font = `${weight} ${size}px ${family}`;
    if (shareCtx.measureText(text).width <= maxWidth) break;
    size -= 6;
  } while (size > minSize);
}

function colorToRgbString(color) {
  if (color.startsWith('#')) return hexToRgb(color);

  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return '0,234,255';
  return match[1].split(',').slice(0, 3).join(',');
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // Fall back to the older selection copy path below.
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    return document.execCommand('copy');
  } catch (_) {
    return false;
  } finally {
    textArea.remove();
  }
}

function showShareStatus(message, tone = '') {
  clearTimeout(shareStatusTimer);
  EL.goShareStatus.textContent = message;
  EL.goShareStatus.classList.toggle('error', tone === 'error');
  EL.goShareStatus.classList.remove('hidden');
  shareStatusTimer = setTimeout(() => {
    EL.goShareStatus.classList.add('hidden');
  }, 2200);
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
  const dailySummary = getCurrentDailySummary();
  const unlocked = LS.getAchievements();
  const unlockedCount = ACHIEVEMENTS.filter(achievement => unlocked[achievement.id]).length;
  const pendingAchievements = LS.getPendingAchievementCount();

  EL.homeSkinsMeta.textContent = `${state.currentSkin.name} active`;
  EL.homeSkinsBtn.style.setProperty('--skin-head', state.currentSkin.head);
  EL.homeSkinsBtn.style.setProperty('--skin-body', state.currentSkin.body);
  EL.homeSkinsBtn.style.setProperty('--skin-tail', state.currentSkin.tail);
  EL.homeSkinsBtn.style.setProperty('--skin-glow', state.currentSkin.glow);
  EL.homeStatsMeta.textContent = isDailyMode(state.currentMode)
    ? `${dailySummary.attempts} today • ${dailySummary.streak}d streak`
    : `${formatCompactInt(modeStats.gamesPlayed)} ${modeStats.gamesPlayed === 1 ? 'run' : 'runs'}`;
  EL.homeAchievementsMeta.textContent = `${unlockedCount}/${ACHIEVEMENTS.length} unlocked`;
  EL.homeAchievementsBadge.textContent = pendingAchievements > 99 ? '99+' : pendingAchievements;
  EL.homeAchievementsBadge.classList.toggle('hidden', pendingAchievements === 0);
  EL.homeSettingsMeta.textContent = `${controlMode === 'keys' ? 'Keypad' : 'Swipe'} controls`;
}

function renderModesPanel() {
  EL.modesGrid.innerHTML = '';
  const selectedIndex = MODES.findIndex(mode => mode.id === state.currentMode.id);

  MODES.forEach((mode, index) => {
    const selected = mode.id === state.currentMode.id;
    const modeDisplay = getModeDisplay(mode);
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
    tag.textContent = modeDisplay.tag;
    tag.style.color = mode.accent;

    top.append(name, tag);

    const desc = document.createElement('div');
    desc.className = 'mode-desc';
    desc.textContent = modeDisplay.description;

    const meta = document.createElement('div');
    meta.className = 'mode-meta';

    getModeChips(mode).forEach(label => {
      const chip = document.createElement('div');
      chip.className = 'mode-chip';
      chip.textContent = label;
      meta.appendChild(chip);
    });

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

function getModeDisplay(mode, dailyChallenge = null) {
  if (!isDailyMode(mode)) {
    return {
      tag: mode.tag,
      description: mode.description,
      bestHeader: `${mode.name} Bests`,
    };
  }

  const challenge = dailyChallenge || getDailyChallenge();
  const summary = LS.getDailySummary(challenge.dateKey);

  return {
    tag: 'Today',
    description: `${challenge.label}. ${summary.completed ? 'Complete' : 'Fresh'} today. Best ${formatCompactInt(summary.bestScore)}.`,
    bestHeader: 'Today Bests',
  };
}

function getModeChips(mode) {
  if (!isDailyMode(mode)) {
    return [
      mode.wrapWalls ? 'Wrap Walls' : 'Solid Walls',
      mode.timerSeconds ? `${mode.timerSeconds}s Timer` : `${mode.scoreBonus}x Score`,
      `${mode.baseTickMs}ms Start`,
    ];
  }

  const challenge = getDailyChallenge();
  const summary = LS.getDailySummary(challenge.dateKey);

  return [
    summary.completed ? 'Complete' : 'Fresh',
    `${summary.attempts} ${summary.attempts === 1 ? 'Try' : 'Tries'}`,
  ];
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

function renderRunAchievementSummary(newAchievements) {
  const unlockCount = newAchievements.length;

  EL.goAchievements.classList.toggle('hidden', unlockCount === 0);
  EL.goAchievementsHeader.textContent = 'Achievements';
  EL.goAchievementCount.textContent = `+${unlockCount}`;
  EL.goAchievementCaption.textContent = `${unlockCount} new achievement${unlockCount === 1 ? '' : 's'} unlocked`;
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

  const cards = isDailyMode(state.currentMode) ? getDailyStatCards(lifetime) : [
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

function getDailyStatCards(lifetime) {
  const challenge = getCurrentDailyChallenge() || getDailyChallenge();
  const summary = LS.getDailySummary(challenge.dateKey);

  return [
    { label: 'Today Best', value: formatCompactInt(summary.bestScore), tone: 'gold' },
    { label: 'Attempts', value: formatCompactInt(summary.attempts), tone: '' },
    { label: 'Streak', value: `${summary.streak}d`, tone: 'green' },
    { label: 'Daily Peak', value: formatCompactInt(summary.allTimeBestScore), tone: 'gold' },
    { label: 'Today Km', value: `${summary.bestDistance.toFixed(2)} km`, tone: 'green' },
    { label: 'Lifetime Runs', value: formatCompactInt(lifetime.gamesPlayed), tone: '' },
  ];
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
    LS.clearPendingAchievementCount();
    updateHomeActionMeta();
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
  EL.shareBtn.addEventListener('click', shareRunScore);

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
