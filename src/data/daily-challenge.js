export const DAILY_MODE_ID = 'daily';

export function isDailyMode(mode) {
  return mode?.daily === true || mode?.id === DAILY_MODE_ID;
}

export function getDailyChallenge(date = new Date()) {
  const dateKey = formatDateKey(date);
  return {
    id: `${DAILY_MODE_ID}-${dateKey}`,
    dateKey,
    label: `Daily #${dateKey}`,
    seed: hashString(`snake-master:${dateKey}`),
  };
}

export function createSeededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
