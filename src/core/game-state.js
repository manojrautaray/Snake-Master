import { BASE_MS, GRID, MAX_SPD_LV, MIN_MS, POOL_SIZE } from '../config.js';

export function createGameState() {
  return {
    cellSize: 0,
    gridCanvas: null,
    snake: null,
    snakeSet: null,
    dir: null,
    nextDir: null,
    food: null,
    score: 0,
    distance: 0,
    multiplier: 1,
    maxMultiplier: 1,
    speedLevel: 1,
    gameRunning: false,
    gameStarted: false,
    currentSkin: null,
    currentMode: null,
    dailyChallenge: null,
    random: Math.random,
    modeTimeLeft: 0,
    modeTimeTotal: 0,
    lastFrameTime: 0,
    gameOverReason: 'collision',
    foodEaten: 0,
    rafId: null,
    lastTickTime: 0,
    tickInterval: BASE_MS,
    foodAnim: 0,
    headBob: 0,
    touchX0: 0,
    touchY0: 0,
    particles: createParticlePool(),
    particleCount: 0,
    hudCache: createHudCache(),
  };
}

export function createParticlePool() {
  return Array.from({ length: POOL_SIZE }, () => ({
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    alpha: 0,
    size: 0,
    color: '',
  }));
}

export function createHudCache() {
  return {
    score: -1,
    multiplier: -1,
    distance: '',
    speedLevel: -1,
    bestScore: -1,
    bestDistance: '',
  };
}

export function resetHudCache(cache) {
  cache.score = -1;
  cache.multiplier = -1;
  cache.distance = '';
  cache.speedLevel = -1;
  cache.bestScore = -1;
  cache.bestDistance = '';
}

export function keyFor(x, y) {
  return x * 100 + y;
}

export function calcInterval(length, mode) {
  return Math.round(getModeBaseTick(mode) - (getModeBaseTick(mode) - getModeMinTick(mode)) * Math.min((length - 3) / 37, 1));
}

export function calcSpeedLevel(intervalMs, mode) {
  const baseTick = getModeBaseTick(mode);
  const minTick = getModeMinTick(mode);
  return Math.round(1 + (baseTick - intervalMs) / (baseTick - minTick) * (MAX_SPD_LV - 1));
}

export function calcMultiplier(length, mode) {
  return Math.max(1, 1 + Math.floor((length - 3) / getMultiplierStep(mode)));
}

export function resetGameState(state) {
  const mode = state.currentMode;
  const spawn = mode?.seeded
    ? createSeededSpawn(state.random || Math.random)
    : createDefaultSpawn();

  state.snake = spawn.snake;
  state.snakeSet = new Set(state.snake.map(segment => keyFor(segment.x, segment.y)));
  state.dir = spawn.dir;
  state.nextDir = spawn.dir;
  state.score = 0;
  state.distance = 0;
  state.multiplier = 1;
  state.maxMultiplier = 1;
  state.tickInterval = getModeBaseTick(mode);
  state.speedLevel = calcSpeedLevel(state.tickInterval, mode);
  state.modeTimeTotal = mode?.timerSeconds || 0;
  state.modeTimeLeft = state.modeTimeTotal;
  state.lastFrameTime = 0;
  state.gameOverReason = 'collision';
  state.foodEaten = 0;
  state.lastTickTime = 0;
  state.particleCount = 0;

  for (const particle of state.particles) {
    particle.alive = false;
  }
}

export function placeFood(state) {
  let point;
  let attempts = 0;
  const random = state.random || Math.random;

  do {
    point = { x: (random() * GRID) | 0, y: (random() * GRID) | 0 };
    attempts += 1;
  } while (state.snakeSet.has(keyFor(point.x, point.y)) && attempts < GRID * GRID * 2);

  if (state.snakeSet.has(keyFor(point.x, point.y))) {
    point = findFirstOpenCell(state);
  }

  state.food = point;
}

function createDefaultSpawn() {
  const mid = GRID >> 1;
  return {
    snake: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
    dir: { x: 1, y: 0 },
  };
}

function createSeededSpawn(random) {
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
  ];
  const dir = directions[(random() * directions.length) | 0] || directions[0];
  const min = 4;
  const max = GRID - 5;
  const head = {
    x: min + ((random() * (max - min + 1)) | 0),
    y: min + ((random() * (max - min + 1)) | 0),
  };

  return {
    snake: [
      head,
      { x: head.x - dir.x, y: head.y - dir.y },
      { x: head.x - dir.x * 2, y: head.y - dir.y * 2 },
    ],
    dir,
  };
}

function findFirstOpenCell(state) {
  for (let y = 0; y < GRID; y += 1) {
    for (let x = 0; x < GRID; x += 1) {
      if (!state.snakeSet.has(keyFor(x, y))) {
        return { x, y };
      }
    }
  }

  return { x: 0, y: 0 };
}

function getModeBaseTick(mode) {
  return mode?.baseTickMs ?? BASE_MS;
}

function getModeMinTick(mode) {
  return mode?.minTickMs ?? MIN_MS;
}

function getMultiplierStep(mode) {
  return mode?.multiplierStep ?? 5;
}
