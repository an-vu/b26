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
  readonly background = computed(() => this.appearance().backgroundColor === '#ffffff' ? '#f9f8f6' : this.appearance().backgroundColor);
  readonly nightBackground = computed(() => this.background() === '#f9f8f6' ? '#30302e' : `color-mix(in srgb, ${this.background()} 38%, #181a19)`);
  readonly foreground = computed(() => {
    const color = this.background().slice(1);
    const values = [0, 2, 4].map(offset => {
      const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722 < .3 ? '#f9f8f6' : '#30302e';
  });

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
