import { computed, signal } from '@angular/core';
import type { Board, BoardAppearance } from '../../models/board';
import { BERRY_APPEARANCE, foregroundColor } from '../../themes/appearance-values';
import { BOARD_THEMES, normalizeThemeId } from '../../themes/board-theme';

type SavedSettings = { name: string; slug: string; appearance: BoardAppearance };

function normalizeAppearance(appearance: BoardAppearance): BoardAppearance {
  return {
    themeFamily:
      BOARD_THEMES.find(
        (theme) => theme.id === normalizeThemeId(appearance.themeFamily) && theme.status === 'available',
      )?.id ?? 'berry',
    theme: appearance.theme === 'dark' ? 'dark' : 'light',
    radiusStep: Number(appearance.radiusStep) as BoardAppearance['radiusStep'],
    spacingStep: Number(appearance.spacingStep ?? 2) as 1 | 2 | 3,
    backgroundColor: appearance.backgroundColor,
    pattern: appearance.pattern,
    patternIntensity: appearance.patternIntensity ?? 'light',
  };
}

/** Editable board settings and their saved baseline. The editor store coordinates requests. */
export class BoardSettingsState {
  readonly boardId = signal('');
  readonly version = signal<number | undefined>(undefined);
  readonly name = signal('');
  readonly slug = signal('');
  private readonly saved = signal<SavedSettings>({
    name: '',
    slug: '',
    appearance: { ...BERRY_APPEARANCE },
  });
  private readonly draft = signal(normalizeAppearance(BERRY_APPEARANCE));

  readonly appearance = this.draft.asReadonly();
  readonly savedName = computed(() => this.saved().name);
  readonly savedSlug = computed(() => this.saved().slug);
  readonly theme = computed(
    () => BOARD_THEMES.find((theme) => theme.id === this.draft().themeFamily) ?? BOARD_THEMES[0],
  );
  readonly foreground = computed(() => foregroundColor(this.draft().backgroundColor));
  /** The default light Berry surface uses dark atmosphere ink. */
  readonly darkInk = computed(
    () =>
      this.theme().id === 'berry' &&
      this.draft().theme !== 'dark' &&
      this.foreground() === '#30302e',
  );
  readonly appearanceChanged = computed(() => {
    const draft = this.draft();
    const saved = this.saved().appearance;
    return (
      draft.spacingStep !== (saved.spacingStep ?? 2) ||
      draft.themeFamily !== normalizeThemeId(saved.themeFamily) ||
      draft.theme !== saved.theme ||
      draft.radiusStep !== saved.radiusStep ||
      draft.backgroundColor !== saved.backgroundColor ||
      draft.pattern !== saved.pattern ||
      draft.patternIntensity !== (saved.patternIntensity ?? 'light')
    );
  });
  readonly changed = computed(
    () =>
      this.appearanceChanged() ||
      this.name() !== this.saved().name ||
      this.slug() !== this.saved().slug,
  );

  applyAppearance(appearance: BoardAppearance) {
    this.draft.set(normalizeAppearance(appearance));
  }

  patchAppearance(patch: Partial<BoardAppearance>) {
    this.applyAppearance({ ...this.draft(), ...patch });
  }

  hydrate(board: Board, preserveAppearanceDraft = false) {
    const appearance = { ...BERRY_APPEARANCE, ...board.appearance };
    appearance.themeFamily = normalizeThemeId(appearance.themeFamily);
    if (appearance.pattern === 'dots') appearance.pattern = 'stars';
    this.boardId.set(board.id);
    this.version.set(board.version);
    this.saved.set({ name: board.boardName, slug: board.boardUrl, appearance });
    this.name.set(board.boardName);
    this.slug.set(board.boardUrl);
    if (!preserveAppearanceDraft) this.applyAppearance(appearance);
  }

  reset() {
    const saved = this.saved();
    this.name.set(saved.name);
    this.slug.set(saved.slug);
    this.applyAppearance(saved.appearance);
  }
}
