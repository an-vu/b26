import { HomeFeedPreviewComponent } from './home-feed-preview';
import { environment } from '../../../environments/environment';
import { Component, DestroyRef, HostListener, inject, signal, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AppearanceSettingsComponent } from '../../components/appearance-settings/appearance-settings';
import { SiteThemeService } from '../../services/site-theme.service';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, filter, finalize, map, of, switchMap, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { DEFAULT_HOME_APPEARANCE, HomeAppearance } from '../../models/home-appearance';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { AppPageShellComponent } from './app-page-shell';

@Component({
  standalone: true, imports: [CommonModule, AppearanceSettingsComponent, RouterLink, AppPageShellComponent, HomeFeedPreviewComponent],
  templateUrl: './home-page.html', styleUrl: './home-page.css'
})
export class HomePageComponent {
  readonly showPreview = !environment.production && ['localhost', '127.0.0.1'].includes(globalThis.location?.hostname);
  readonly auth = inject(AuthService);
  private readonly boards = inject(BoardService);
  private readonly siteTheme = inject(SiteThemeService);
  private readonly destroyRef = inject(DestroyRef);
  readonly appearance = signal<HomeAppearance>({ ...DEFAULT_HOME_APPEARANCE });
  readonly settingsOpen = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly toggle = (open: boolean) => !open;
  private userId: string | null = null;

  constructor() {
    effect(() => this.siteTheme.homeAppearance.set(this.appearance()));
    this.destroyRef.onDestroy(() => this.siteTheme.homeAppearance.set(null));
    this.auth.user$.pipe(map(user => user?.id ?? null), distinctUntilChanged(), switchMap(id => {
      this.userId = id;
      this.appearance.set({ ...DEFAULT_HOME_APPEARANCE });
      this.settingsOpen.set(false); this.error.set(''); this.loading.set(!!id);
      return id ? this.boards.getHomeAppearance().pipe(catchError(error => {
        this.error.set(getApiErrorMessage(error, 'Unable to load Home settings.'));
        return of({ ...DEFAULT_HOME_APPEARANCE });
      })) : of({ ...DEFAULT_HOME_APPEARANCE });
    }), takeUntilDestroyed(this.destroyRef)).subscribe(appearance => {
      this.appearance.set({ ...DEFAULT_HOME_APPEARANCE, ...appearance }); this.loading.set(false);
    });
  }

  saveAppearance(next: HomeAppearance) {
    if (!this.userId || this.loading() || this.saving()) return;
    const previous = this.appearance();
    this.appearance.set(next); this.saving.set(true); this.error.set('');
    const userId = this.userId;
    this.boards.updateHomeAppearance(next).pipe(
      takeUntil(this.auth.user$.pipe(filter(user => user?.id !== userId))),
      takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: saved => this.appearance.set(saved),
      error: error => {
        this.appearance.set(previous);
        this.error.set(getApiErrorMessage(error, 'Unable to save Home settings. Please retry.'));
      },
    });
  }
  @HostListener('document:keydown.escape') closeSettings() { this.settingsOpen.set(false); }
  @HostListener('document:click', ['$event']) outsideSettings(event: MouseEvent) {
    if (event.target instanceof Element && !event.target.closest('.home-settings-anchor')) this.closeSettings();
  }
}
