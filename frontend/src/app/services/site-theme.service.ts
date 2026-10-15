import { BERRY_APPEARANCE } from '../themes/appearance-values';
import { paperColor, nightColor, foregroundColor } from '../themes/appearance-values';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, Subscription } from 'rxjs';
import { BoardAppearance } from '../models/board';
import { normalizeThemeId } from '../themes/board-theme';
import { AuthService } from './auth.service';
import { BoardService } from './board.service';
import { BoardStoreService } from './board-store.service';
import { UserStoreService } from './user-store.service';

/**
 * Which look the site shows:
 * - A board page shows that board's own saved appearance, for its owner and for visitors.
 * - Home shows the signed-in user's Home appearance, and every other app page (Settings, Insights, …)
 *   uses that same saved Home appearance.
 * - Signed-out app pages use Berry.
 */
@Injectable({ providedIn: 'root' })
export class SiteThemeService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(BoardService);
  private readonly boards = inject(BoardStoreService);
  private readonly users = inject(UserStoreService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly user = toSignal(this.auth.user$, { initialValue: null });
  private homeRequest?: Subscription;
  /** The signed-in user's saved Home appearance: the app theme for Settings, Insights and other app pages. */
  readonly savedHomeAppearance = signal<BoardAppearance | null>(null);
  /** The look the current page asks for (a board's appearance, or Home's live preview), with its owner. */
  private readonly page = signal<{ owner: object; appearance: BoardAppearance } | null>(null);
  readonly appearance = computed<BoardAppearance>(() => {
    const chosen = this.page()?.appearance ?? (this.user() ? this.savedHomeAppearance() : null);
    const appearance = { ...BERRY_APPEARANCE, ...chosen };
    appearance.themeFamily = normalizeThemeId(appearance.themeFamily);
    return appearance;
  });
  readonly themeId = computed(() => normalizeThemeId(this.appearance().themeFamily));
  readonly colorMode = computed(() => this.appearance().theme);
  readonly background = computed(() => paperColor(this.appearance().backgroundColor));
  readonly nightBackground = computed(() => nightColor(this.background()));
  readonly foreground = computed(() => foregroundColor(this.background()));

  constructor() {
    // The single owner of account data loading: pages read these stores instead of refetching.
    this.auth.user$.pipe(map(user => user?.id ?? null), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.homeRequest?.unsubscribe();
        this.savedHomeAppearance.set(null);
        this.users.clearProfile();
        this.boards.clearBoards();
        if (id) {
          this.users.refreshMyProfile();
          this.users.refreshMyPreferences();
          this.boards.refreshBoards();
          this.homeRequest = this.api.getHomeAppearance().pipe(catchError(() => of(null)))
            .subscribe(appearance => this.savedHomeAppearance.set(appearance));
        }
      });
    if (this.auth.getAccessToken()) {
      this.auth.me().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: error => { if (error.status === 401) this.auth.clearSession(); }
      });
    }
  }

  /** A page shows its own look until it releases it. */
  showPageAppearance(owner: object, appearance: BoardAppearance) { this.page.set({ owner, appearance }); }

  /** Only the page that set the look can clear it, so a page leaving late can't wipe the next page's look. */
  releasePageAppearance(owner: object) { if (this.page()?.owner === owner) this.page.set(null); }
}
