import { Component, DestroyRef, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, filter, finalize, map } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserStoreService } from '../../services/user-store.service';
import { BoardStoreService } from '../../services/board-store.service';
import { SiteThemeService } from '../../services/site-theme.service';
import { UserSearchComponent } from '../user-search/user-search';
import { AboutPanelComponent } from '../about-panel/about-panel';
import { getApiErrorMessage } from '../../utils/api-error.util';

@Component({
  selector: 'app-site-navigation', standalone: true,
  imports: [CommonModule, RouterLink, UserSearchComponent, AboutPanelComponent],
  templateUrl: './site-navigation.html',
  styleUrls: ['../../pages/board-page/board-page.account-menu.css', './site-navigation.css']
})
export class SiteNavigationComponent {
  readonly theme = inject(SiteThemeService);
  readonly brandAtTop = input(false);
  readonly beforeSignOut = input<() => boolean>(() => true);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UserStoreService);
  private readonly boards = inject(BoardStoreService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  readonly user$ = combineLatest([this.auth.user$, this.users.profile$]).pipe(map(([user, profile]) => user ? profile ?? user : null));
  readonly accountOpen = signal(false);
  readonly signingOut = signal(false);
  readonly error = signal('');
  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.accountOpen.set(false));
  }
  toggleAccount() { this.accountOpen.update(open => !open); }
  closeAccount() { this.accountOpen.set(false); }
  @HostListener('document:keydown.escape') onEscape() { this.closeAccount(); }
  @HostListener('document:click', ['$event']) onOutsideClick(event: MouseEvent) {
    if (event.target instanceof Node && !this.host.nativeElement.querySelector('.account-menu-wrap')?.contains(event.target)) this.closeAccount();
  }
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
