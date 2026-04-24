function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount * 255 | 0)},${Math.min(255, g + amount * 255 | 0)},${Math.min(255, b + amount * 255 | 0)})`;
}

export function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount * 255 | 0)},${Math.max(0, g - amount * 255 | 0)},${Math.max(0, b - amount * 255 | 0)})`;
}

