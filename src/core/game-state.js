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

export function calcInterval(length) {
  return Math.round(BASE_MS - (BASE_MS - MIN_MS) * Math.min((length - 3) / 37, 1));
}

export function calcSpeedLevel(intervalMs) {
  return Math.round(1 + (BASE_MS - intervalMs) / (BASE_MS - MIN_MS) * (MAX_SPD_LV - 1));
}

export function calcMultiplier(length) {
  return Math.max(1, 1 + Math.floor((length - 3) / 5));
}

export function resetGameState(state) {
  const mid = GRID >> 1;
  state.snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  state.snakeSet = new Set(state.snake.map(segment => keyFor(segment.x, segment.y)));
  state.dir = { x: 1, y: 0 };
  state.nextDir = { x: 1, y: 0 };
  state.score = 0;
  state.distance = 0;
  state.multiplier = 1;
  state.maxMultiplier = 1;
  state.speedLevel = 1;
  state.tickInterval = BASE_MS;
  state.lastTickTime = 0;
  state.particleCount = 0;

  for (const particle of state.particles) {
    particle.alive = false;
  }
}

export function placeFood(state) {
  let point;
  do {
    point = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
  } while (state.snakeSet.has(keyFor(point.x, point.y)));

  state.food = point;
}
