import { paperColor, nightColor, foregroundColor } from '../themes/appearance-values';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { BoardAppearance } from '../models/board';
import { BOARD_THEMES } from '../themes/board-theme';
import { AuthService } from './auth.service';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';

export const BERRY_APPEARANCE: BoardAppearance = {
  themeFamily: 'default', theme: 'light', backgroundColor: '#f9f8f6',
  radiusStep: 2, spacingStep: 2, pattern: 'none', patternIntensity: 'light',
};

@Injectable({ providedIn: 'root' })
export class SiteThemeService {
  private readonly auth = inject(AuthService);
  private readonly boards = inject(BoardStoreService);
  private readonly users = inject(UserStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mainAppearance = signal<BoardAppearance>({ ...BERRY_APPEARANCE });
  readonly homeAppearance = signal<BoardAppearance | null>(null);
  readonly appearance = computed(() => this.homeAppearance() ?? this.mainAppearance());
  readonly themeId = computed(() => this.appearance().themeFamily ?? 'default');
  readonly colorMode = computed(() => this.appearance().theme);
  readonly background = computed(() => paperColor(this.appearance().backgroundColor));
  readonly nightBackground = computed(() => nightColor(this.background()));
  readonly foreground = computed(() => foregroundColor(this.background()));

  constructor() {
    combineLatest([this.auth.user$, this.users.mainBoardId$, this.boards.boards$])
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([user, mainId, boards]) => {
        const main = user && mainId ? boards.find(board => board.id === mainId) : undefined;
        const appearance = { ...BERRY_APPEARANCE, ...main?.appearance };
        appearance.themeFamily = BOARD_THEMES.find(theme => theme.id === appearance.themeFamily)?.id ?? 'default';
        this.mainAppearance.set(appearance);
      });
    this.auth.user$.pipe(map(user => user?.id ?? null), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.homeAppearance.set(null);
        this.users.clearProfile();
        this.boards.clearBoards();
        if (id) {
          this.users.refreshMyProfile();
          this.users.refreshMyPreferences();
          this.boards.refreshBoards();
        }
      });
    if (this.auth.getAccessToken()) {
      this.auth.me().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: error => { if (error.status === 401) this.auth.clearSession(); }
      });
    }
  }
}
