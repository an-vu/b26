/** Visual families are independent of light/dark color mode. */
export type BoardThemeId = 'default' | 'frutiger-aero' | 'aqua';
export type BoardColorMode = 'light' | 'dark';

type BoardThemeDefinition = {
  readonly id: BoardThemeId;
  readonly label: string;
  readonly status: 'available' | 'planned';
  readonly direction: string;
};

/** Planned families must not appear as working choices in a theme picker.
 * Before enabling one, implement its scoped stylesheet and persisted selection.
 * Keep the existing API's appearance.theme field reserved for light/dark.
 */
export const BOARD_THEMES = [
  {
    id: 'default',
    label: 'Default',
    status: 'available',
    direction: 'The existing BlueBerry design, with its board color and pattern controls.',
  },
  {
    id: 'frutiger-aero',
    label: 'Frutiger Aero',
    status: 'available',
    direction: 'Luminous glass, sky and water colors, glossy surfaces, and nature-inspired imagery.',
  },
  {
    id: 'aqua',
    label: 'Aqua',
    status: 'available',
    direction: 'Early Mac OS X: gel controls, soft pinstripes, metallic chrome, and dimensional shadows.',
  },
] as const satisfies readonly BoardThemeDefinition[];

export const DEFAULT_BOARD_THEME = BOARD_THEMES[0];
