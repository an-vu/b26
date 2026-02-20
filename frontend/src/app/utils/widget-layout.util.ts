export function getTileLayoutClass(layout: string): string {
  if (layout === 'span-4') {
    return 'tile-span-4';
  }
  if (layout === 'span-3') {
    return 'tile-span-3';
  }
  if (layout === 'span-1x2') {
    return 'tile-span-1x2';
  }
  if (layout === 'span-2x2') {
    return 'tile-span-2x2';
  }
  if (layout === 'span-3x3') {
    return 'tile-span-3x3';
  }
  if (layout === 'span-2') {
    return 'tile-span-2';
  }
  return 'tile-span-1';
}
