import { HeroWordmarkDirective } from '../../directives/hero-wordmark';
import { BerryMaterialsDirective } from '../../directives/berry-materials';
import { PanelComponent } from '../panel/panel';
import { PanelBehaviorDirective, PanelDismissReason } from '../../directives/panel-behavior';
import { IconComponent } from '../icon/icon';
import { ChromeBlurService } from '../../services/chrome-blur.service';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserStoreService } from '../../services/user-store.service';
import { BoardStoreService } from '../../services/board-store.service';
import { SiteThemeService } from '../../services/site-theme.service';
import { UserSearchComponent } from '../user-search/user-search';
import { AboutPanelComponent } from '../about-panel/about-panel';
import { getApiErrorMessage } from '../../utils/api-error.util';

@Component({
  selector: 'app-site-navigation', standalone: true,
  imports: [HeroWordmarkDirective, BerryMaterialsDirective, PanelComponent, PanelBehaviorDirective, IconComponent, RouterLink, UserSearchComponent, AboutPanelComponent],
  templateUrl: './site-navigation.html',
  styleUrls: ['./account-panel.css', './site-navigation.css']
})
export class SiteNavigationComponent {
  readonly blur = inject(ChromeBlurService);
  readonly theme = inject(SiteThemeService);
  readonly brandAtTop = input(false);
  readonly visitorHero = input(false);
  readonly topBlur = input(false);
  readonly blurSuppressed = input(false);
  readonly blurDuration = input(520);
  readonly beforeSignOut = input<() => boolean>(() => true);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserStoreService);
  private readonly boards = inject(BoardStoreService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authUser = toSignal(this.auth.user$, { initialValue: null });
  readonly user = computed(() => this.authUser() ? this.users.profile() ?? this.authUser() : null);
  /** One keyed item: Safari can retain an old backdrop, so the footer glass is rebuilt when the canvas changes. */
  readonly footerBackdrop = computed(() => [{ id: `${this.theme.themeId()}:${this.theme.colorMode()}:${this.theme.background()}` }]);
  readonly accountOpen = signal(false);
  readonly accountSettingsOpen = signal(false);
  toggleAccountSettings() { this.accountSettingsOpen.update(open => !open); }
  dismissAccount(reason: PanelDismissReason) {
    if (reason === 'back') this.accountSettingsOpen.set(false);
    else this.closeAccount();
  }
  readonly signingOut = signal(false);
  readonly error = signal('');
  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.closeAccount());
  }
  toggleAccount() { if (this.accountOpen()) this.closeAccount(); else { this.accountSettingsOpen.set(false); this.accountOpen.set(true); } }
  closeAccount() { this.accountOpen.set(false); this.accountSettingsOpen.set(false); }
  signOut() {
    if (this.signingOut() || !this.beforeSignOut()()) return;
    this.signingOut.set(true); this.error.set('');
    this.auth.signout().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.signingOut.set(false)))
      .subscribe({
        next: () => { this.users.clearProfile(); this.boards.clearBoards(); this.closeAccount(); void this.router.navigateByUrl('/'); },
        error: error => this.error.set(getApiErrorMessage(error, 'Unable to sign out. Please retry.'))
      });
  }
}
