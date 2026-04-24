export function evaluateAchievements(achievements, context, unlockedMap) {
  return achievements.filter(achievement => {
    if (unlockedMap[achievement.id]) return false;
    return achievement.condition(context);
  });
}

