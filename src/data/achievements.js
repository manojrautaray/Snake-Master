export const ACHIEVEMENTS = [
  {
    id: 'first_run',
    name: 'First Run',
    description: 'Play your first game.',
    category: 'Starter',
    condition: ({ stats }) => stats.lifetime.gamesPlayed >= 1,
  },
  {
    id: 'snack_starter',
    name: 'Snack Starter',
    description: 'Eat 10 food total.',
    category: 'Food',
    condition: ({ stats }) => stats.lifetime.foodEaten >= 10,
  },
  {
    id: 'neon_hunter',
    name: 'Neon Hunter',
    description: 'Eat 100 food total.',
    category: 'Food',
    condition: ({ stats }) => stats.lifetime.foodEaten >= 100,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach a 5x multiplier.',
    category: 'Skill',
    condition: ({ stats }) => stats.lifetime.bestMultiplier >= 5,
  },
  {
    id: 'marathon',
    name: 'Marathon',
    description: 'Travel 5 km total.',
    category: 'Distance',
    condition: ({ stats }) => stats.lifetime.totalDistance >= 5,
  },
  {
    id: 'classic_climber',
    name: 'Classic Climber',
    description: 'Score 500 in Classic.',
    category: 'Classic',
    condition: ({ bestScores }) => bestScores.classic >= 500,
  },
  {
    id: 'clock_crusher',
    name: 'Clock Crusher',
    description: 'Score 300 in Time Attack.',
    category: 'Time Attack',
    condition: ({ bestScores }) => bestScores.timeAttack >= 300,
  },
  {
    id: 'hardcore_survivor',
    name: 'Hardcore Survivor',
    description: 'Survive 60 seconds in Hardcore.',
    category: 'Hardcore',
    condition: ({ stats }) => (stats.modes.hardcore?.bestDuration || 0) >= 60,
  },
];

