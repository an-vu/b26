/** Rendering values shared by Board and the site theme; persisted colors stay untouched. */
export function paperColor(color: string): string {
  return color.toLowerCase() === '#ffffff' ? '#f9f8f6' : color;
}
export function nightColor(color: string): string {
  const background = paperColor(color);
  return background === '#f9f8f6' ? '#30302e' : `color-mix(in srgb, ${background} 38%, #181a19)`;
}
export function foregroundColor(color: string): string {
  const hex = paperColor(color).slice(1);
  const [r, g, b] = [0, 2, 4].map(offset => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  return r * .2126 + g * .7152 + b * .0722 < .3 ? '#f9f8f6' : '#30302e';
}
