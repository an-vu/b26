import { BoardSettingsState } from './board-settings-state';
import { BERRY_APPEARANCE } from '../../themes/appearance-values';
import type { BoardThemeId } from '../../themes/board-theme';

describe('Board settings ownership', () => {
  it('keeps unchanged appearance inputs stable and restores the saved baseline after edits', () => {
    const settings = new BoardSettingsState();
    settings.hydrate({ id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '', version: 2,
      appearance: { ...BERRY_APPEARANCE, radiusStep: 5, pattern: 'dots' } });
    const appearance = settings.appearance();
    expect(settings.appearance()).toBe(appearance);
    expect(appearance.pattern).toBe('stars');
    expect(settings.changed()).toBe(false);
    settings.patchAppearance({ radiusStep: 1 }); settings.name.set('Changed');
    expect(settings.appearance()).not.toBe(appearance);
    expect(settings.changed()).toBe(true);
    settings.reset();
    expect(settings.name()).toBe('One');
    expect(settings.appearance().radiusStep).toBe(5);
    expect(settings.changed()).toBe(false);
  });

  it('preserves newer appearance edits while accepting an automatic save response', () => {
    const settings = new BoardSettingsState();
    settings.patchAppearance({ backgroundColor: '#abcdef' });
    settings.hydrate({ id: 'one', boardUrl: 'new-slug', boardName: 'Saved', name: 'Alice', headline: '', version: 3,
      appearance: BERRY_APPEARANCE }, true);
    expect(settings.appearance().backgroundColor).toBe('#abcdef');
    expect(settings.changed()).toBe(true);
    expect(settings.version()).toBe(3);
    expect(settings.slug()).toBe('new-slug');
    settings.reset();
    expect(settings.appearance()).toEqual(BERRY_APPEARANCE);
  });

  it('reads legacy theme ids as their current ids without marking the board changed', () => {
    const settings = new BoardSettingsState();
    settings.hydrate({ id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '', version: 2,
      appearance: { ...BERRY_APPEARANCE, themeFamily: 'lofi' as BoardThemeId } });
    expect(settings.appearance().themeFamily).toBe('valencia');
    expect(settings.theme().label).toBe('Valencia');
    expect(settings.changed()).toBe(false);
  });
});
