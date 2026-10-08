const FOOTPRINTS: Readonly<Record<string, readonly [number, number]>> = {
  'span-1': [1, 1], 'span-2': [2, 1], 'span-3': [3, 1], 'span-4': [4, 1],
  'span-1x2': [1, 2], 'span-2x2': [2, 2], 'span-3x3': [3, 3],
};

export function getWidgetFootprint(layout: string): readonly [number, number] {
  return FOOTPRINTS[layout] ?? FOOTPRINTS['span-1'];
}

export function getTileLayoutClass(layout: string): string {
  return `tile-${layout in FOOTPRINTS ? layout : 'span-1'}`;
}
