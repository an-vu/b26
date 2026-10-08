/** Visual families are independent of light/dark color mode. */
export type BoardThemeId = 'default' | 'frutiger-aero' | 'aqua' | 'omahakase' | 'kiwi';
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
    label: 'Berry',
    status: 'available',
    direction: 'Warm paper, editorial serif typography, and quiet monochrome controls.',
  },
  {
    id: 'frutiger-aero',
    label: 'Aero',
    status: 'available',
    direction: 'Luminous glass, sky and water colors, glossy surfaces, and nature-inspired imagery.',
  },
  {
    id: 'aqua',
    label: 'Aqua',
    status: 'available',
    direction: 'Leopard–Mavericks and iOS 4–6: silver windows, blue chrome, linen, tactile controls, and a Snow Leopard-inspired violet aurora.',
  },
  { id: 'omahakase', label: 'Omakase', status: 'available', direction: 'Black lacquer, illuminated rose glass, cherry blossoms, and amber light.' },
  { id: 'kiwi', label: 'Kiwi', status: 'available', direction: 'Liquid lime, clear console plastic, chrome edges, and luminous dreamlike ribbons.' },
] as const satisfies readonly BoardThemeDefinition[];

export const DEFAULT_BOARD_THEME = BOARD_THEMES[0];
