/** Visual families are independent of light/dark color mode. */
export type BoardThemeId = 'berry' | 'aero' | 'aqua' | 'omakase' | 'kiwi' | 'valencia';
export type BoardColorMode = 'light' | 'dark';

type BoardThemeDefinition = {
  readonly id: BoardThemeId;
  readonly label: string;
  readonly status: 'available' | 'planned';
  readonly direction: string;
};

/** Theme ids are persisted, so they should not change; labels may. Stylesheets are named by id
 * (src/themes/<id>.css; shared material rules live in materials.css). Ids renamed in V42 are
 * still accepted through normalizeThemeId().
 *
 * Planned families must not appear as working choices in a theme picker.
 * Before enabling one, implement its scoped stylesheet and persisted selection.
 * Keep the existing API's appearance.theme field reserved for light/dark.
 */
export const BOARD_THEMES = [
  {
    id: 'berry',
    label: 'Berry',
    status: 'available',
    direction: 'Warm paper, editorial serif typography, and quiet monochrome controls.',
  },
  {
    id: 'aero',
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
  { id: 'omakase', label: 'Omakase', status: 'available', direction: 'Black lacquer, illuminated rose glass, cherry blossoms, and amber light.' },
  { id: 'kiwi', label: 'Kiwi', status: 'available', direction: 'Liquid lime, clear console plastic, chrome edges, and luminous dreamlike ribbons.' },
  { id: 'valencia', label: 'Valencia', status: 'available', direction: 'Named after the classic 2012 Instagram filter: blue enamel, silver photo panels, subtle grain, and charcoal camera controls.' },
] as const satisfies readonly BoardThemeDefinition[];

export const DEFAULT_BOARD_THEME = BOARD_THEMES[0];

/** Ids renamed in V42 (default, frutiger-aero, omahakase, lofi); cached data or an older API may still send them. */
const LEGACY_THEME_IDS: ReadonlyMap<string, BoardThemeId> = new Map<string, BoardThemeId>([
  ['default', 'berry'], ['frutiger-aero', 'aero'], ['omahakase', 'omakase'], ['lofi', 'valencia'],
]);

/** Maps a saved theme id (current or legacy) to a current id; unknown or missing ids fall back to Berry. */
export function normalizeThemeId(id: string | null | undefined): BoardThemeId {
  const current = (id && LEGACY_THEME_IDS.get(id)) ?? id;
  return BOARD_THEMES.find(theme => theme.id === current)?.id ?? DEFAULT_BOARD_THEME.id;
}
