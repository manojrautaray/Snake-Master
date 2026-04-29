export const LS = {
  getBest: modeId => parseInt(readMetric('best', modeId) || '0', 10),
  setBest: (value, modeId) => writeMetric('best', value, modeId),
  getBestDist: modeId => parseFloat(readMetric('dist', modeId) || '0'),
  setBestDist: (value, modeId) => writeMetric('dist', value, modeId),
  getSkin: () => localStorage.getItem('sm_skin') || 'cyber',
  setSkin: id => localStorage.setItem('sm_skin', id),
  getMode: () => localStorage.getItem('sm_mode') || 'classic',
  setMode: id => localStorage.setItem('sm_mode', id),
  getControlMode: () => localStorage.getItem('sm_control_mode') || 'swipe',
  setControlMode: mode => localStorage.setItem('sm_control_mode', mode),
  getStats: () => readStats(),
  recordRun: run => recordRun(run),
  getDailySummary: dateKey => getDailySummary(dateKey),
  recordDailyRun: run => recordDailyRun(run),
  getAchievements: () => readAchievements(),
  unlockAchievements: achievements => unlockAchievements(achievements),
  getPendingAchievementCount: () => getPendingAchievementCount(),
  addPendingAchievementCount: count => addPendingAchievementCount(count),
  clearPendingAchievementCount: () => clearPendingAchievementCount(),
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
  stats.lifetime.bestDuration = Math.max(stats.lifetime.bestDuration, run.durationSeconds);

  modeStats.gamesPlayed += 1;
  modeStats.foodEaten += run.foodEaten;
  modeStats.totalDistance += run.distance;
  modeStats.totalScore += run.score;
  modeStats.totalSeconds += run.durationSeconds;
  modeStats.bestMultiplier = Math.max(modeStats.bestMultiplier, run.maxMultiplier);
  modeStats.bestDuration = Math.max(modeStats.bestDuration, run.durationSeconds);
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
      bestDuration: 0,
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
    modes: Object.fromEntries(Object.entries(stats?.modes || {}).map(([modeId, modeStats]) => [
      modeId,
      {
        ...createEmptyModeStats(),
        ...modeStats,
      },
    ])),
  };
}

function ensureModeStats(stats, modeId) {
  if (!stats.modes[modeId]) {
    stats.modes[modeId] = createEmptyModeStats();
  }

  return stats.modes[modeId];
}

function createEmptyModeStats() {
  return {
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
}

function readAchievements() {
  const raw = localStorage.getItem('sm_achievements');
  if (!raw) return {};

  try {
    return JSON.parse(raw) || {};
  } catch (_) {
    return {};
  }
}

function unlockAchievements(achievements) {
  if (!achievements.length) return readAchievements();

  const unlocked = readAchievements();
  const unlockedAt = new Date().toISOString();
  achievements.forEach(achievement => {
    unlocked[achievement.id] = unlocked[achievement.id] || unlockedAt;
  });
  localStorage.setItem('sm_achievements', JSON.stringify(unlocked));
  return unlocked;
}

function getPendingAchievementCount() {
  return parseInt(localStorage.getItem('sm_pending_achievements') || '0', 10) || 0;
}

function addPendingAchievementCount(count) {
  if (!count) return getPendingAchievementCount();

  const nextCount = getPendingAchievementCount() + count;
  localStorage.setItem('sm_pending_achievements', String(nextCount));
  return nextCount;
}

function clearPendingAchievementCount() {
  localStorage.removeItem('sm_pending_achievements');
  return 0;
}

function getDailySummary(dateKey) {
  const daily = readDaily();
  const result = {
    ...createEmptyDailyResult(),
    ...(daily.results[dateKey] || {}),
  };

  return {
    ...result,
    streak: daily.streak,
    allTimeBestScore: daily.allTimeBestScore,
    allTimeBestDistance: daily.allTimeBestDistance,
    allTimeBestDate: daily.allTimeBestDate,
    lastPlayedDate: daily.lastPlayedDate,
  };
}

function recordDailyRun(run) {
  const daily = readDaily();
  const dateKey = run.dateKey;
  if (!dateKey) {
    return getDailySummary(dateKey);
  }

  const result = {
    ...createEmptyDailyResult(),
    ...(daily.results[dateKey] || {}),
  };

  if (daily.lastPlayedDate !== dateKey) {
    daily.streak = daily.lastPlayedDate === getPreviousDateKey(dateKey)
      ? Math.max(0, daily.streak) + 1
      : 1;
    daily.lastPlayedDate = dateKey;
  }

  result.attempts += 1;
  result.completed = true;
  result.lastPlayedAt = new Date().toISOString();

  if (run.score > result.bestScore) {
    result.bestScore = run.score;
  }
  if (run.distance > result.bestDistance) {
    result.bestDistance = run.distance;
  }

  daily.results[dateKey] = result;

  if (run.score > daily.allTimeBestScore) {
    daily.allTimeBestScore = run.score;
    daily.allTimeBestDate = dateKey;
  }
  if (run.distance > daily.allTimeBestDistance) {
    daily.allTimeBestDistance = run.distance;
  }

  pruneDailyResults(daily);
  writeDaily(daily);
  return getDailySummary(dateKey);
}

function readDaily() {
  const raw = localStorage.getItem('sm_daily');
  if (!raw) {
    return createEmptyDaily();
  }

  try {
    return mergeDailyShape(JSON.parse(raw));
  } catch (_) {
    return createEmptyDaily();
  }
}

function writeDaily(daily) {
  localStorage.setItem('sm_daily', JSON.stringify(daily));
}

function createEmptyDaily() {
  return {
    lastPlayedDate: '',
    streak: 0,
    allTimeBestScore: 0,
    allTimeBestDistance: 0,
    allTimeBestDate: '',
    results: {},
  };
}

function createEmptyDailyResult() {
  return {
    attempts: 0,
    bestScore: 0,
    bestDistance: 0,
    completed: false,
    lastPlayedAt: '',
  };
}

function mergeDailyShape(daily) {
  const base = createEmptyDaily();
  const results = Object.fromEntries(Object.entries(daily?.results || {}).map(([dateKey, result]) => [
    dateKey,
    {
      ...createEmptyDailyResult(),
      ...result,
      attempts: Number(result?.attempts) || 0,
      bestScore: Number(result?.bestScore) || 0,
      bestDistance: Number(result?.bestDistance) || 0,
      completed: Boolean(result?.completed),
    },
  ]));

  return {
    ...base,
    ...(daily || {}),
    streak: Number(daily?.streak) || 0,
    allTimeBestScore: Number(daily?.allTimeBestScore) || 0,
    allTimeBestDistance: Number(daily?.allTimeBestDistance) || 0,
    results,
  };
}

function getPreviousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function pruneDailyResults(daily) {
  const keep = new Set(Object.keys(daily.results).sort().slice(-60));
  Object.keys(daily.results).forEach(dateKey => {
    if (!keep.has(dateKey)) {
      delete daily.results[dateKey];
    }
  });
}
