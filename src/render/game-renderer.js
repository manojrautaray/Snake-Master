import { GRID, TWO_PI } from '../config.js';
import { darken, lighten } from '../utils/colors.js';

export function buildGridCache(cellSize, size) {
  const gridCanvas = document.createElement('canvas');
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

  return gridCanvas;
}

export function drawScene(ctx, canvas, state) {
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  if (state.gridCanvas) {
    ctx.drawImage(state.gridCanvas, 0, 0);
  }

  if (!state.snake) return;

  drawFood(ctx, state);
  drawSnake(ctx, state);

  if (state.particleCount > 0) {
    drawParticles(ctx, state);
  }
}

function drawFood(ctx, state) {
  const skin = state.currentSkin;
  const pulse = 0.90 + 0.10 * Math.sin(state.foodAnim);
  const pad = state.cellSize * 0.10;
  const inner = state.cellSize - pad * 2;
  const size = inner * pulse;
  const centerX = state.food.x * state.cellSize + state.cellSize * 0.5;
  const centerY = state.food.y * state.cellSize + state.cellSize * 0.5;
  const x = centerX - size * 0.5;
  const y = centerY - size * 0.5;

  ctx.save();
  ctx.shadowColor = skin.foodGlow;
  ctx.shadowBlur = 10 + 6 * Math.sin(state.foodAnim);

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

function drawSnake(ctx, state) {
  const skin = state.currentSkin;
  const length = state.snake.length;
  const pad = state.cellSize * 0.10;
  const size = state.cellSize - pad * 2;

  for (let i = length - 1; i >= 0; i--) {
    const segment = state.snake[i];
    const isHead = i === 0;
    const bobY = isHead ? Math.sin(state.headBob) * 1.0 : 0;
    const x = segment.x * state.cellSize + pad;
    const y = segment.y * state.cellSize + pad + bobY;

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
      drawEyes(ctx, state, segment, bobY);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawEyes(ctx, state, segment, bobY) {
  const centerX = segment.x * state.cellSize + state.cellSize * 0.5;
  const centerY = segment.y * state.cellSize + state.cellSize * 0.5 + bobY;
  const eyeOffset = state.cellSize * 0.20;
  const eyeRadius = state.cellSize * 0.09;
  const pupilFactor = 0.52;
  let eyeOne;
  let eyeTwo;

  if (state.dir.x === 1) {
    eyeOne = { x: centerX + state.cellSize * 0.13, y: centerY - eyeOffset };
    eyeTwo = { x: centerX + state.cellSize * 0.13, y: centerY + eyeOffset };
  } else if (state.dir.x === -1) {
    eyeOne = { x: centerX - state.cellSize * 0.13, y: centerY - eyeOffset };
    eyeTwo = { x: centerX - state.cellSize * 0.13, y: centerY + eyeOffset };
  } else if (state.dir.y === -1) {
    eyeOne = { x: centerX - eyeOffset, y: centerY - state.cellSize * 0.13 };
    eyeTwo = { x: centerX + eyeOffset, y: centerY - state.cellSize * 0.13 };
  } else {
    eyeOne = { x: centerX - eyeOffset, y: centerY + state.cellSize * 0.13 };
    eyeTwo = { x: centerX + eyeOffset, y: centerY + state.cellSize * 0.13 };
  }

  const pupilX = state.dir.x * eyeRadius * pupilFactor;
  const pupilY = state.dir.y * eyeRadius * pupilFactor;

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

function drawParticles(ctx, state) {
  for (const particle of state.particles) {
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
