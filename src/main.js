import {
  BASE_MS,
  DIST_TICK,
  GRID,
  MAX_SPD_LV,
  MIN_MS,
  POOL_SIZE,
  TWO_PI,
} from './config.js';
import { SKINS } from './data/skins.js';
import { LS } from './systems/storage.js';
import { EL, ctx } from './ui/dom.js';
import { darken, lighten } from './utils/colors.js';

let cellSize;
let gridCanvas;

let snake;
let snakeSet;
let dir;
let nextDir;
let food;
let score;
let distance;
let multiplier;
let maxMultiplier;
let speedLevel;
let gameRunning = false;
let gameStarted = false;
let currentSkin = null;

let rafId = null;
let lastTickTime = 0;
let tickInterval = BASE_MS;

let foodAnim = 0;
let headBob = 0;

const pPool = Array.from({ length: POOL_SIZE }, () => ({
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  alpha: 0,
  size: 0,
  color: '',
}));
let pActive = 0;

let touchX0 = 0;
let touchY0 = 0;

let hScoreCache = -1;
let hMultCache = -1;
let hDistCache = '';
let hSpeedCache = -1;
let hBestCache = -1;
let hBestDistCache = '';

let audioCtx = null;
let masterGain = null;
let bgmRunning = false;
let bgmScheduleId = null;
let bgmAtmosOsc = null;
let bgmAtmosOsc2 = null;
let bgmPadGain = null;
let arpStep = 0;
let arpNextTime = 0;

const ARP_NOTES = [110, 130.81, 164.81, 196, 220, 261.63, 329.63, 392];
const LOOK_AHEAD = 0.15;
const SCHEDULE_MS = 70;

const KEY_MAP = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

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

  cellSize = size / GRID;
  buildGridCache(size);
}

function buildGridCache(size) {
  gridCanvas = document.createElement('canvas');
  gridCanvas.width = size;
  gridCanvas.height = size;

  const gc = gridCanvas.getContext('2d');
  gc.strokeStyle = 'rgba(0,110,150,0.12)';
  gc.lineWidth = 0.5;

  for (let i = 0; i <= GRID; i++) {
    const point = i * cellSize;
    gc.beginPath();
    gc.moveTo(point, 0);
    gc.lineTo(point, size);
    gc.stroke();
    gc.beginPath();
    gc.moveTo(0, point);
    gc.lineTo(size, point);
    gc.stroke();
  }
}

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(audioCtx.destination);
    } catch (_) {
      return false;
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return true;
}

function tone(freq, type, volume, offsetSec, duration) {
  if (!ensureAudio()) return;

  const time = audioCtx.currentTime + offsetSec;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(volume, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(time);
  osc.stop(time + duration + 0.01);
}

function playEat() {
  tone(523.25, 'sine', 0.07, 0, 0.10);
  tone(783.99, 'sine', 0.05, 0.05, 0.09);
}

function playGameOverSFX() {
  tone(220, 'triangle', 0.10, 0, 0.30);
  tone(174.61, 'triangle', 0.08, 0.18, 0.28);
  tone(130.81, 'triangle', 0.06, 0.35, 0.35);
}

function playCountdownTick(isGo) {
  tone(isGo ? 880 : 600, 'sine', 0.15, 0, 0.12);
}

function softKick(time) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, time);
  osc.frequency.exponentialRampToValueAtTime(35, time + 0.07);
  gain.gain.setValueAtTime(0.07, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.10);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(time);
  osc.stop(time + 0.11);
}

function softHat(time, volume) {
  if (!audioCtx) return;

  const buffer = audioCtx.createBuffer(1, Math.ceil(audioCtx.sampleRate * 0.035), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = audioCtx.createBufferSource();
  const hpf = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  hpf.type = 'highpass';
  hpf.frequency.value = 8000;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
  source.buffer = buffer;
  source.connect(hpf);
  hpf.connect(gain);
  gain.connect(masterGain);
  source.start(time);
  source.stop(time + 0.04);
}

function getBgmTempo() {
  const tempoMix = (tickInterval - MIN_MS) / (BASE_MS - MIN_MS);
  return Math.round(160 - tempoMix * 70);
}

function scheduleBgm() {
  if (!bgmRunning || !audioCtx) return;

  const bpm = getBgmTempo();
  const beatSec = 60 / bpm;
  const eighth = beatSec / 2;

  while (arpNextTime < audioCtx.currentTime + LOOK_AHEAD) {
    const step = arpStep % 16;

    if (step === 0 || step === 8) {
      softKick(arpNextTime);
    }

    softHat(arpNextTime, step % 2 === 0 ? 0.025 : 0.012);

    if (step === 0) {
      tone(ARP_NOTES[0], 'sine', 0.04, arpNextTime - audioCtx.currentTime, beatSec * 1.8);
    }

    if (step % 2 === 0) {
      const noteIndex = Math.floor(step / 2) % ARP_NOTES.length;
      const volume = step === 0 ? 0.028 : 0.016;
      tone(ARP_NOTES[noteIndex], 'sine', volume, arpNextTime - audioCtx.currentTime, eighth * 0.65);
    }

    arpStep++;
    arpNextTime += eighth;
  }

  bgmScheduleId = setTimeout(scheduleBgm, SCHEDULE_MS);
}

function startBGM() {
  if (!ensureAudio() || bgmRunning) return;

  bgmRunning = true;
  arpStep = 0;
  arpNextTime = audioCtx.currentTime + 0.08;

  bgmAtmosOsc = audioCtx.createOscillator();
  bgmAtmosOsc2 = audioCtx.createOscillator();
  bgmPadGain = audioCtx.createGain();

  const lowPass = audioCtx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 320;

  bgmAtmosOsc.type = 'sine';
  bgmAtmosOsc.frequency.value = 55.0;
  bgmAtmosOsc2.type = 'sine';
  bgmAtmosOsc2.frequency.value = 55.4;
  bgmPadGain.gain.value = 0.022;

  bgmAtmosOsc.connect(lowPass);
  bgmAtmosOsc2.connect(lowPass);
  lowPass.connect(bgmPadGain);
  bgmPadGain.connect(masterGain);
  bgmAtmosOsc.start();
  bgmAtmosOsc2.start();

  scheduleBgm();
}

function stopBGM() {
  bgmRunning = false;

  if (bgmScheduleId) {
    clearTimeout(bgmScheduleId);
    bgmScheduleId = null;
  }

  try {
    bgmAtmosOsc.stop();
  } catch (_) {}

  try {
    bgmAtmosOsc2.stop();
  } catch (_) {}

  bgmAtmosOsc = null;
  bgmAtmosOsc2 = null;
  bgmPadGain = null;
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

function key(x, y) {
  return x * 100 + y;
}

function resetGame() {
  const mid = GRID >> 1;
  snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  snakeSet = new Set(snake.map(segment => key(segment.x, segment.y)));
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  distance = 0;
  multiplier = 1;
  maxMultiplier = 1;
  speedLevel = 1;
  tickInterval = BASE_MS;
  lastTickTime = 0;
  pActive = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    pPool[i].alive = false;
  }

  placeFood();
  resetHUDCache();
  updateHUD();
}

function placeFood() {
  let point;
  do {
    point = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
  } while (snakeSet.has(key(point.x, point.y)));

  food = point;
}

function calcInterval(length) {
  return Math.round(BASE_MS - (BASE_MS - MIN_MS) * Math.min((length - 3) / 37, 1));
}

function calcSpeedLevel(intervalMs) {
  return Math.round(1 + (BASE_MS - intervalMs) / (BASE_MS - MIN_MS) * (MAX_SPD_LV - 1));
}

function calcMultiplier(length) {
  return Math.max(1, 1 + Math.floor((length - 3) / 5));
}

function spawnParticles(gx, gy, color) {
  const px = (gx + 0.5) * cellSize;
  const py = (gy + 0.5) * cellSize;
  let spawned = 0;

  for (let i = 0; i < POOL_SIZE && spawned < 12; i++) {
    if (pPool[i].alive) continue;

    const particle = pPool[i];
    const angle = Math.random() * TWO_PI;
    const speed = 1.6 + Math.random() * 2.6;

    particle.alive = true;
    particle.x = px;
    particle.y = py;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.alpha = 1;
    particle.size = 2 + Math.random() * 3;
    particle.color = color;
    pActive++;
    spawned++;
  }
}

function updateParticles() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const particle = pPool[i];
    if (!particle.alive) continue;

    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.07;
    particle.alpha *= 0.87;
    particle.size *= 0.965;

    if (particle.alpha < 0.02) {
      particle.alive = false;
      pActive--;
    }
  }
}

function tick() {
  dir = nextDir;
  const nextX = ((snake[0].x + dir.x) % GRID + GRID) % GRID;
  const nextY = ((snake[0].y + dir.y) % GRID + GRID) % GRID;
  const nextKey = key(nextX, nextY);

  const tail = snake[snake.length - 1];
  const tailKey = key(tail.x, tail.y);
  snakeSet.delete(tailKey);

  if (snakeSet.has(nextKey)) {
    snakeSet.add(tailKey);
    endGame();
    return;
  }

  snake.unshift({ x: nextX, y: nextY });
  snakeSet.add(nextKey);

  const ateFood = nextX === food.x && nextY === food.y;
  if (ateFood) {
    snakeSet.add(tailKey);
    score += 10 * multiplier;
    multiplier = calcMultiplier(snake.length);
    maxMultiplier = Math.max(maxMultiplier, multiplier);
    tickInterval = calcInterval(snake.length);
    speedLevel = calcSpeedLevel(tickInterval);
    playEat();
    spawnParticles(food.x, food.y, currentSkin.food);
    placeFood();
  } else {
    snake.pop();
  }

  distance += DIST_TICK;
  updateHUD();
}

function updateHUD() {
  const bestScore = Math.max(LS.getBest(), score);
  const bestDistance = Math.max(LS.getBestDist(), distance);
  const distanceLabel = `${distance.toFixed(2)} km`;
  const bestDistanceLabel = bestDistance.toFixed(2);

  if (score !== hScoreCache) {
    EL.hScore.textContent = score;
    hScoreCache = score;
  }

  if (multiplier !== hMultCache) {
    EL.hMult.textContent = `${multiplier}x`;
    hMultCache = multiplier;
  }

  if (distanceLabel !== hDistCache) {
    EL.hDist.textContent = distanceLabel;
    hDistCache = distanceLabel;
  }

  if (speedLevel !== hSpeedCache) {
    EL.hSpeed.textContent = speedLevel;
    hSpeedCache = speedLevel;
  }

  if (bestScore !== hBestCache) {
    EL.hBest.textContent = bestScore;
    hBestCache = bestScore;
  }

  if (bestDistanceLabel !== hBestDistCache) {
    EL.hBestdist.textContent = bestDistanceLabel;
    hBestDistCache = bestDistanceLabel;
  }
}

function resetHUDCache() {
  hScoreCache = -1;
  hMultCache = -1;
  hDistCache = '';
  hSpeedCache = -1;
  hBestCache = -1;
  hBestDistCache = '';
}

function endGame() {
  gameRunning = false;
  stopBGM();
  playGameOverSFX();
  triggerScreenShake();

  const isNewScore = score > LS.getBest();
  const isNewDist = distance > LS.getBestDist();

  if (isNewScore) {
    LS.setBest(score);
  }
  if (isNewDist) {
    LS.setBestDist(+distance.toFixed(3));
  }

  renderSkinsPanel();

  setTimeout(() => {
    EL.goScore.textContent = score;
    EL.goDist.textContent = `${distance.toFixed(2)} km`;
    EL.goMult.textContent = `${maxMultiplier}x`;
    EL.goBest.textContent = LS.getBest();
    EL.goBestdist.textContent = `${LS.getBestDist().toFixed(2)} km`;
    EL.goBest.classList.toggle('new-best', isNewScore);
    EL.goBestdist.classList.toggle('new-best', isNewDist);
    document.body.classList.add('menu-open');
    EL.goOv.classList.remove('hidden');
  }, 420);
}

function loop(timestamp) {
  rafId = requestAnimationFrame(loop);
  foodAnim += 0.07;
  headBob += 0.10;

  if (pActive > 0) {
    updateParticles();
  }

  if (gameRunning) {
    if (!lastTickTime) {
      lastTickTime = timestamp;
    }

    if (timestamp - lastTickTime >= tickInterval) {
      lastTickTime += tickInterval;
      tick();
    }
  }

  draw();
}

function draw() {
  const size = EL.canvas.width;
  ctx.clearRect(0, 0, size, size);

  if (gridCanvas) {
    ctx.drawImage(gridCanvas, 0, 0);
  }

  if (!snake) return;

  drawFood();
  drawSnake();

  if (pActive > 0) {
    drawParticles();
  }
}

function drawFood() {
  const skin = currentSkin;
  const pulse = 0.90 + 0.10 * Math.sin(foodAnim);
  const pad = cellSize * 0.10;
  const inner = cellSize - pad * 2;
  const size = inner * pulse;
  const centerX = food.x * cellSize + cellSize * 0.5;
  const centerY = food.y * cellSize + cellSize * 0.5;
  const x = centerX - size * 0.5;
  const y = centerY - size * 0.5;

  ctx.save();
  ctx.shadowColor = skin.foodGlow;
  ctx.shadowBlur = 10 + 6 * Math.sin(foodAnim);

  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 0.72);
  grad.addColorStop(0, lighten(skin.food, 0.38));
  grad.addColorStop(0.5, skin.food);
  grad.addColorStop(1, darken(skin.food, 0.30));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size, size);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillRect(x + size * 0.12, y + size * 0.12, size * 0.28, size * 0.18);
  ctx.restore();
}

function drawSnake() {
  const skin = currentSkin;
  const length = snake.length;
  const pad = cellSize * 0.10;
  const size = cellSize - pad * 2;

  for (let i = length - 1; i >= 0; i--) {
    const segment = snake[i];
    const isHead = i === 0;
    const bobY = isHead ? Math.sin(headBob) * 1.0 : 0;
    const x = segment.x * cellSize + pad;
    const y = segment.y * cellSize + pad + bobY;

    if (isHead) {
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 14;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = skin.head;
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, y, size, 2);
    ctx.fillRect(x, y, 2, size);

    if (isHead) {
      drawEyes(segment, bobY);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawEyes(segment, bobY) {
  const centerX = segment.x * cellSize + cellSize * 0.5;
  const centerY = segment.y * cellSize + cellSize * 0.5 + bobY;
  const eyeOffset = cellSize * 0.20;
  const eyeRadius = cellSize * 0.09;
  const pupilFactor = 0.52;
  let eyeOne;
  let eyeTwo;

  if (dir.x === 1) {
    eyeOne = { x: centerX + cellSize * 0.13, y: centerY - eyeOffset };
    eyeTwo = { x: centerX + cellSize * 0.13, y: centerY + eyeOffset };
  } else if (dir.x === -1) {
    eyeOne = { x: centerX - cellSize * 0.13, y: centerY - eyeOffset };
    eyeTwo = { x: centerX - cellSize * 0.13, y: centerY + eyeOffset };
  } else if (dir.y === -1) {
    eyeOne = { x: centerX - eyeOffset, y: centerY - cellSize * 0.13 };
    eyeTwo = { x: centerX + eyeOffset, y: centerY - cellSize * 0.13 };
  } else {
    eyeOne = { x: centerX - eyeOffset, y: centerY + cellSize * 0.13 };
    eyeTwo = { x: centerX + eyeOffset, y: centerY + cellSize * 0.13 };
  }

  const pupilX = dir.x * eyeRadius * pupilFactor;
  const pupilY = dir.y * eyeRadius * pupilFactor;

  [eyeOne, eyeTwo].forEach(eye => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, eyeRadius, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(eye.x + pupilX, eye.y + pupilY, eyeRadius * 0.54, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.68)';
    ctx.beginPath();
    ctx.arc(eye.x + pupilX - eyeRadius * 0.2, eye.y + pupilY - eyeRadius * 0.2, eyeRadius * 0.22, 0, TWO_PI);
    ctx.fill();
  });
}

function drawParticles() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const particle = pPool[i];
    if (!particle.alive) continue;

    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, TWO_PI);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function onKeyDown(event) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === 'Space') {
    if (!gameStarted) {
      startWithCountdown();
    }
    return;
  }

  if (!gameRunning) return;

  const nextDirection = KEY_MAP[event.code];
  if (nextDirection && !(nextDirection.x === -dir.x && nextDirection.y === -dir.y)) {
    nextDir = nextDirection;
  }
}

function onTouchStart(event) {
  event.preventDefault();
  touchX0 = event.touches[0].clientX;
  touchY0 = event.touches[0].clientY;
}

function onTouchEnd(event) {
  event.preventDefault();
  const dx = event.changedTouches[0].clientX - touchX0;
  const dy = event.changedTouches[0].clientY - touchY0;

  if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

  if (!gameStarted) {
    startWithCountdown();
    return;
  }

  if (!gameRunning) return;

  const nextDirection = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 })
    : (dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });

  if (!(nextDirection.x === -dir.x && nextDirection.y === -dir.y)) {
    nextDir = nextDirection;
  }
}

function renderSkinsPanel() {
  EL.skinsGrid.innerHTML = '';

  SKINS.forEach(skin => {
    const unlocked = skin.cond();
    const selected = skin.id === currentSkin.id;
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
    badge.textContent = unlocked ? (selected ? 'ON' : 'USE') : '🔒';

    card.append(preview, info, badge);
    if (unlocked) {
      card.addEventListener('click', () => {
        currentSkin = skin;
        LS.setSkin(skin.id);
        renderSkinsPanel();
      });
    }

    EL.skinsGrid.appendChild(card);
  });
}

function showStartScreen() {
  gameStarted = false;
  gameRunning = false;
  stopBGM();
  document.body.classList.add('menu-open');
  EL.startOv.classList.remove('hidden');
  EL.goOv.classList.add('hidden');
  renderSkinsPanel();
  resetGame();
  EL.hBest.textContent = LS.getBest();
  EL.hBestdist.textContent = LS.getBestDist().toFixed(2);
}

function startWithCountdown() {
  if (gameStarted) return;

  gameStarted = true;
  ensureAudio();
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
      lastTickTime = 0;
      gameRunning = true;
      startBGM();
      return;
    }

    const isGo = steps[index] === 'GO!';
    playCountdownTick(isGo);

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
  currentSkin = SKINS.find(skin => skin.id === LS.getSkin()) || SKINS[0];

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  EL.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  EL.canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  EL.startBtn.addEventListener('click', startWithCountdown);

  EL.restartBtn.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    EL.goOv.classList.add('hidden');
    gameStarted = false;
    startWithCountdown();
  });

  EL.homeBtn.addEventListener('click', () => {
    EL.goOv.classList.add('hidden');
    showStartScreen();
  });

  showStartScreen();
  rafId = requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
