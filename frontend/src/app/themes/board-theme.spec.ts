import { BOARD_THEMES, normalizeThemeId } from './board-theme';

describe('Theme ids', () => {
  it.each([
    ['default', 'berry'], ['frutiger-aero', 'aero'], ['omahakase', 'omakase'], ['lofi', 'valencia'],
  ])('maps the legacy %s id to %s', (legacy, current) => {
    expect(normalizeThemeId(legacy)).toBe(current);
  });

  it('keeps current ids and falls back to Berry for unknown or missing ids', () => {
    for (const theme of BOARD_THEMES) expect(normalizeThemeId(theme.id)).toBe(theme.id);
    expect(BOARD_THEMES.map(theme => theme.id)).toEqual(['berry', 'aero', 'aqua', 'omakase', 'kiwi', 'valencia']);
    for (const unknown of ['unknown', 'constructor', '', null, undefined]) expect(normalizeThemeId(unknown)).toBe('berry');
  });
});
