import type { Board, BoardAppearance } from '../../models/board';
import { BERRY_APPEARANCE, paperColor, foregroundColor } from '../../themes/appearance-values';
import { BOARD_THEMES, type BoardThemeId } from '../../themes/board-theme';

/** Owns the editable settings and their saved baseline; the page coordinates access and requests. */
export class BoardSettingsState {
  boardId = '';
  version?: number;
  name = '';
  slug = '';
  savedName = '';
  savedSlug = '';
  savedAppearance = { ...BERRY_APPEARANCE };
  themeFamily: BoardThemeId = 'default';
  dark = false;
  radius: BoardAppearance['radiusStep'] = 2;
  gap: 1 | 2 | 3 = 2;
  background = BERRY_APPEARANCE.backgroundColor;
  pattern: BoardAppearance['pattern'] = 'none';
  intensity: NonNullable<BoardAppearance['patternIntensity']> = 'light';

  get theme() { return BOARD_THEMES.find(theme => theme.id === this.themeFamily) ?? BOARD_THEMES[0]; }
  get foreground() { return foregroundColor(this.background); }
  get paper() { return paperColor(this.background); }
  private displayedAppearance = { ...BERRY_APPEARANCE };
  get appearance(): BoardAppearance {
    const next: BoardAppearance = { themeFamily: this.themeFamily, theme: this.dark ? 'dark' : 'light',
      radiusStep: Number(this.radius) as BoardAppearance['radiusStep'], spacingStep: Number(this.gap) as 1 | 2 | 3,
      backgroundColor: this.background, pattern: this.pattern, patternIntensity: this.intensity };
    if (Object.keys(next).some(key => next[key as keyof BoardAppearance] !== this.displayedAppearance[key as keyof BoardAppearance])) {
      this.displayedAppearance = next;
    }
    return this.displayedAppearance;
  }
  get appearanceChanged() {
    const draft = this.appearance, saved = this.savedAppearance;
    return draft.spacingStep !== (saved.spacingStep ?? 2) || draft.themeFamily !== (saved.themeFamily ?? 'default') ||
      draft.theme !== saved.theme || draft.radiusStep !== saved.radiusStep || draft.backgroundColor !== saved.backgroundColor ||
      draft.pattern !== saved.pattern || draft.patternIntensity !== (saved.patternIntensity ?? 'light');
  }
  get changed() { return this.appearanceChanged || this.name !== this.savedName || this.slug !== this.savedSlug; }

  applyAppearance(appearance: BoardAppearance) {
    this.themeFamily = BOARD_THEMES.find(theme => theme.id === appearance.themeFamily && theme.status === 'available')?.id ?? 'default';
    this.dark = appearance.theme === 'dark';
    this.radius = appearance.radiusStep;
    this.gap = appearance.spacingStep ?? 2;
    this.background = appearance.backgroundColor;
    this.pattern = appearance.pattern;
    this.intensity = appearance.patternIntensity ?? 'light';
  }

  hydrate(board: Board, preserveAppearanceDraft = false) {
    this.boardId = board.id;
    this.version = board.version;
    this.name = this.savedName = board.boardName;
    this.slug = this.savedSlug = board.boardUrl;
    this.savedAppearance = { ...BERRY_APPEARANCE, ...board.appearance };
    if (this.savedAppearance.pattern === 'dots') this.savedAppearance.pattern = 'stars';
    if (!preserveAppearanceDraft) this.applyAppearance(this.savedAppearance);
  }

  reset() {
    this.name = this.savedName;
    this.slug = this.savedSlug;
    this.applyAppearance(this.savedAppearance);
  }
}
