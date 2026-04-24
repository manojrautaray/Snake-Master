export const LS = {
  getBest: modeId => parseInt(readMetric('best', modeId) || '0', 10),
  setBest: (value, modeId) => writeMetric('best', value, modeId),
  getBestDist: modeId => parseFloat(readMetric('dist', modeId) || '0'),
  setBestDist: (value, modeId) => writeMetric('dist', value, modeId),
  getSkin: () => localStorage.getItem('sm_skin') || 'cyber',
  setSkin: id => localStorage.setItem('sm_skin', id),
  getMode: () => localStorage.getItem('sm_mode') || 'classic',
  setMode: id => localStorage.setItem('sm_mode', id),
  getStats: () => readStats(),
  recordRun: run => recordRun(run),
};

function readMetric(metric, modeId) {
  if (!modeId) {
    return localStorage.getItem(`sm_${metric}`) || '0';
  }

  const modeValue = localStorage.getItem(`sm_${metric}_${modeId}`);
  if (modeValue !== null) {
    return modeValue;
  }

  if (modeId === 'classic') {
    return localStorage.getItem(`sm_${metric}`) || '0';
  }

  return '0';
}

function writeMetric(metric, value, modeId) {
  if (!modeId) {
    localStorage.setItem(`sm_${metric}`, value);
    return;
  }

  localStorage.setItem(`sm_${metric}_${modeId}`, value);
}

function readStats() {
  const raw = localStorage.getItem('sm_stats');
  if (!raw) {
    return createEmptyStats();
  }

  try {
    return mergeStatsShape(JSON.parse(raw));
  } catch (_) {
    return createEmptyStats();
  }
}

function writeStats(stats) {
  localStorage.setItem('sm_stats', JSON.stringify(stats));
}

function recordRun(run) {
  const stats = readStats();
  const modeStats = ensureModeStats(stats, run.modeId);

  stats.lifetime.gamesPlayed += 1;
  stats.lifetime.foodEaten += run.foodEaten;
  stats.lifetime.totalDistance += run.distance;
  stats.lifetime.totalScore += run.score;
  stats.lifetime.totalSeconds += run.durationSeconds;
  stats.lifetime.bestMultiplier = Math.max(stats.lifetime.bestMultiplier, run.maxMultiplier);

  modeStats.gamesPlayed += 1;
  modeStats.foodEaten += run.foodEaten;
  modeStats.totalDistance += run.distance;
  modeStats.totalScore += run.score;
  modeStats.totalSeconds += run.durationSeconds;
  modeStats.bestMultiplier = Math.max(modeStats.bestMultiplier, run.maxMultiplier);
  modeStats.lastScore = run.score;
  modeStats.lastDistance = run.distance;
  modeStats.lastDuration = run.durationSeconds;

  writeStats(stats);
  return stats;
}

function createEmptyStats() {
  return {
    lifetime: {
      gamesPlayed: 0,
      foodEaten: 0,
      totalDistance: 0,
      totalScore: 0,
      totalSeconds: 0,
      bestMultiplier: 1,
    },
    modes: {},
  };
}

function mergeStatsShape(stats) {
  const base = createEmptyStats();
  return {
    lifetime: {
      ...base.lifetime,
      ...(stats?.lifetime || {}),
    },
    modes: stats?.modes || {},
  };
}

function ensureModeStats(stats, modeId) {
  if (!stats.modes[modeId]) {
    stats.modes[modeId] = {
      gamesPlayed: 0,
      foodEaten: 0,
      totalDistance: 0,
      totalScore: 0,
      totalSeconds: 0,
      bestMultiplier: 1,
      lastScore: 0,
      lastDistance: 0,
      lastDuration: 0,
    };
  }

  return stats.modes[modeId];
}
