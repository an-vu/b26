import { BoardSettingsState } from './board-settings-state';
import { BERRY_APPEARANCE } from '../../themes/appearance-values';

describe('Board settings ownership', () => {
  it('keeps unchanged appearance inputs stable and restores the saved baseline after edits', () => {
    const settings = new BoardSettingsState();
    settings.hydrate({ id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: '', version: 2,
      appearance: { ...BERRY_APPEARANCE, radiusStep: 5, pattern: 'dots' } });
    const appearance = settings.appearance;
    expect(settings.appearance).toBe(appearance);
    expect(settings.pattern).toBe('stars');
    expect(settings.changed).toBe(false);
    settings.radius = 1; settings.name = 'Changed';
    expect(settings.appearance).not.toBe(appearance);
    expect(settings.changed).toBe(true);
    settings.reset();
    expect(settings.name).toBe('One');
    expect(settings.radius).toBe(5);
    expect(settings.changed).toBe(false);
  });

  it('preserves newer appearance edits while accepting an automatic save response', () => {
    const settings = new BoardSettingsState();
    settings.background = '#abcdef';
    settings.hydrate({ id: 'one', boardUrl: 'new-slug', boardName: 'Saved', name: 'Alice', headline: '', version: 3,
      appearance: BERRY_APPEARANCE }, true);
    expect(settings.background).toBe('#abcdef');
    expect(settings.changed).toBe(true);
    expect(settings.version).toBe(3);
    expect(settings.slug).toBe('new-slug');
    settings.reset();
    expect(settings.appearance).toEqual(BERRY_APPEARANCE);
  });
});
