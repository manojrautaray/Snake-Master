const byId = id => document.getElementById(id);

export const EL = {
  canvas: byId('gameCanvas'),
  canvasWrap: byId('canvas-wrap'),
  hud: byId('hud'),
  startOv: byId('start-overlay'),
  goOv: byId('go-overlay'),
  cdWrap: byId('cd-wrap'),
  cdNum: byId('cd-num'),
  skinsGrid: byId('skins-grid'),
  startBtn: byId('start-btn'),
  restartBtn: byId('restart-btn'),
  homeBtn: byId('home-btn'),
  hScore: byId('h-score'),
  hMult: byId('h-mult'),
  hDist: byId('h-dist'),
  hSpeed: byId('h-speed'),
  hBest: byId('h-best'),
  hBestdist: byId('h-bestdist'),
  goScore: byId('go-score'),
  goBest: byId('go-best'),
  goDist: byId('go-dist'),
  goBestdist: byId('go-bestdist'),
  goMult: byId('go-mult'),
};

export const ctx = EL.canvas.getContext('2d');

