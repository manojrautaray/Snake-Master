import { LS } from '../systems/storage.js';

export const SKINS = [
  { id: 'cyber', name: 'Cyber', head: '#00eaff', body: '#0077aa', tail: '#003850', glow: 'rgba(0,234,255,.8)', food: '#ff2d78', foodGlow: 'rgba(255,45,120,.9)', unlock: 'Default', cond: () => true },
  { id: 'venom', name: 'Venom', head: '#00ff88', body: '#009944', tail: '#00291a', glow: 'rgba(0,255,136,.8)', food: '#ffd700', foodGlow: 'rgba(255,215,0,.9)', unlock: 'Score 500', cond: () => LS.getBest() >= 500 },
  { id: 'plasma', name: 'Plasma', head: '#ff2d78', body: '#aa0033', tail: '#360011', glow: 'rgba(255,45,120,.8)', food: '#00eaff', foodGlow: 'rgba(0,234,255,.9)', unlock: 'Score 1500', cond: () => LS.getBest() >= 1500 },
  { id: 'gold', name: 'Gold Rush', head: '#ffd700', body: '#aa7700', tail: '#332200', glow: 'rgba(255,215,0,.8)', food: '#a855f7', foodGlow: 'rgba(168,85,247,.9)', unlock: '1.5 km dist', cond: () => LS.getBestDist() >= 1.5 },
  { id: 'shadow', name: 'Shadow', head: '#a855f7', body: '#6200cc', tail: '#1a003d', glow: 'rgba(168,85,247,.8)', food: '#ff6b2b', foodGlow: 'rgba(255,107,43,.9)', unlock: 'Score 3000', cond: () => LS.getBest() >= 3000 },
  { id: 'inferno', name: 'Inferno', head: '#ff6b2b', body: '#aa2200', tail: '#330800', glow: 'rgba(255,107,43,.8)', food: '#00ff88', foodGlow: 'rgba(0,255,136,.9)', unlock: '5 km dist', cond: () => LS.getBestDist() >= 5 },
];

