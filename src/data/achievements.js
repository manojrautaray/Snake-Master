const FOOD_THRESHOLDS = [1, 5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500];
const SCORE_THRESHOLDS = [100, 500, 1000, 2500, 5000, 10000, 20000, 50000, 100000, 200000];
const DISTANCE_THRESHOLDS = [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500];
const RUN_THRESHOLDS = [1, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
const TIME_THRESHOLDS = [60, 300, 600, 1800, 3600, 7200, 14400, 28800];
const MULTIPLIER_THRESHOLDS = [2, 3, 4, 5, 7, 10, 15, 20];
const MODE_SCORE_THRESHOLDS = [100, 250, 500, 1000, 2000, 3500, 5000, 7500];
const MODE_RUN_THRESHOLDS = [1, 5, 10, 25, 50, 100];

const MODE_LABELS = {
  classic: 'Classic',
  timeAttack: 'Time Attack',
  hardcore: 'Hardcore',
};

export const ACHIEVEMENTS = [
  ...buildLifetimeAchievements({
    metric: 'foodEaten',
    thresholds: FOOD_THRESHOLDS,
    category: 'Food',
    badgePrefix: 'FD',
    namePrefix: 'Snack Chain',
    description: target => `Eat ${formatNumber(target)} food total.`,
  }),
  ...buildLifetimeAchievements({
    metric: 'totalScore',
    thresholds: SCORE_THRESHOLDS,
    category: 'Score',
    badgePrefix: 'SC',
    namePrefix: 'Score Surge',
    description: target => `Bank ${formatNumber(target)} total points.`,
  }),
  ...buildLifetimeAchievements({
    metric: 'totalDistance',
    thresholds: DISTANCE_THRESHOLDS,
    category: 'Distance',
    badgePrefix: 'KM',
    namePrefix: 'Neon Miles',
    description: target => `Travel ${formatDistance(target)} total.`,
  }),
  ...buildLifetimeAchievements({
    metric: 'gamesPlayed',
    thresholds: RUN_THRESHOLDS,
    category: 'Runs',
    badgePrefix: 'RN',
    namePrefix: 'Run Streak',
    description: target => `Play ${formatNumber(target)} games.`,
  }),
  ...buildLifetimeAchievements({
    metric: 'totalSeconds',
    thresholds: TIME_THRESHOLDS,
    category: 'Time',
    badgePrefix: 'TM',
    namePrefix: 'Grid Time',
    description: target => `Survive ${formatDuration(target)} total.`,
  }),
  ...buildLifetimeAchievements({
    metric: 'bestMultiplier',
    thresholds: MULTIPLIER_THRESHOLDS,
    category: 'Multiplier',
    badgePrefix: 'MX',
    namePrefix: 'Multiplier Peak',
    description: target => `Reach a ${target}x multiplier.`,
  }),
  ...buildModeScoreAchievements('classic', 'CL'),
  ...buildModeScoreAchievements('timeAttack', 'TA'),
  ...buildModeScoreAchievements('hardcore', 'HC'),
  ...buildModeRunAchievements('classic', 'CR'),
  ...buildModeRunAchievements('timeAttack', 'TR'),
  ...buildModeRunAchievements('hardcore', 'HR'),
];

function buildLifetimeAchievements({ metric, thresholds, category, badgePrefix, namePrefix, description }) {
  return thresholds.map((target, index) => ({
    id: `${metric}_${normaliseTarget(target)}`,
    name: `${namePrefix} ${index + 1}`,
    description: description(target),
    category,
    badge: `${badgePrefix}${index + 1}`,
    condition: ({ stats }) => (stats.lifetime[metric] || 0) >= target,
    progress: ({ stats }) => progress(stats.lifetime[metric] || 0, target),
  }));
}

function buildModeScoreAchievements(modeId, badgePrefix) {
  const modeName = MODE_LABELS[modeId];
  return MODE_SCORE_THRESHOLDS.map((target, index) => ({
    id: `${modeId}_score_${target}`,
    name: `${modeName} Score ${index + 1}`,
    description: `Score ${formatNumber(target)} in ${modeName}.`,
    category: modeName,
    badge: `${badgePrefix}${index + 1}`,
    condition: ({ bestScores }) => (bestScores[modeId] || 0) >= target,
    progress: ({ bestScores }) => progress(bestScores[modeId] || 0, target),
  }));
}

function buildModeRunAchievements(modeId, badgePrefix) {
  const modeName = MODE_LABELS[modeId];
  return MODE_RUN_THRESHOLDS.map((target, index) => ({
    id: `${modeId}_runs_${target}`,
    name: `${modeName} Runs ${index + 1}`,
    description: `Play ${formatNumber(target)} ${modeName} runs.`,
    category: modeName,
    badge: `${badgePrefix}${index + 1}`,
    condition: ({ stats }) => (stats.modes[modeId]?.gamesPlayed || 0) >= target,
    progress: ({ stats }) => progress(stats.modes[modeId]?.gamesPlayed || 0, target),
  }));
}

function progress(value, target) {
  const current = Math.min(value, target);
  return {
    current,
    target,
    ratio: target > 0 ? Math.min(current / target, 1) : 1,
  };
}

function normaliseTarget(target) {
  return String(target).replace('.', '_');
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function formatDistance(value) {
  return `${formatNumber(value)} km`;
}

function formatDuration(seconds) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${formatNumber(seconds / 3600)} hr`;
}
