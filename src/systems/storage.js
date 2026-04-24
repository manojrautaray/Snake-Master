export const LS = {
  getBest: modeId => parseInt(readMetric('best', modeId) || '0', 10),
  setBest: (value, modeId) => writeMetric('best', value, modeId),
  getBestDist: modeId => parseFloat(readMetric('dist', modeId) || '0'),
  setBestDist: (value, modeId) => writeMetric('dist', value, modeId),
  getSkin: () => localStorage.getItem('sm_skin') || 'cyber',
  setSkin: id => localStorage.setItem('sm_skin', id),
  getMode: () => localStorage.getItem('sm_mode') || 'classic',
  setMode: id => localStorage.setItem('sm_mode', id),
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
