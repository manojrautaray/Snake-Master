export const LS = {
  getBest: () => parseInt(localStorage.getItem('sm_best') || '0', 10),
  setBest: value => localStorage.setItem('sm_best', value),
  getBestDist: () => parseFloat(localStorage.getItem('sm_dist') || '0'),
  setBestDist: value => localStorage.setItem('sm_dist', value),
  getSkin: () => localStorage.getItem('sm_skin') || 'cyber',
  setSkin: id => localStorage.setItem('sm_skin', id),
};

