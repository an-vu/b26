import { boardRoute } from '../../models/board-route';
import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { FormsModule } from '@angular/forms';
import { of, Subject, timer } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Widget } from '../../models/widget';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';
import { UserStoreService } from '../../services/user-store.service';
import type { UpdateUserProfileRequest, UserProfile } from '../../models/board';

type UserSettingsState = {
  displayName: string;
  username: string;
  email: string;
  profileSavedField: 'displayName' | 'username' | 'email' | null;
  mainBoardId: string;
  saved: boolean;
  errorMessage: string;
  isHydrating: boolean;
};

@Component({
  selector: 'app-account-settings-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './account-settings-form.html',
  styleUrl: './account-settings-form.css',
})
export class AccountSettingsFormComponent {
  readonly showMainBoard = input(true);
  readonly boardRoute = boardRoute;
  readonly widget = input<Widget>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly boardStore = inject(BoardStoreService);
  private readonly boardService = inject(BoardService);
  private readonly userStore = inject(UserStoreService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  isSigningOut = false;
  private readonly state = signal<UserSettingsState>(this.emptyState());
  private readonly accountReset$ = new Subject<void>();
  private accountId: string | null = null;

  private emptyState(): UserSettingsState {
    return {
      displayName: '',
      username: '',
      email: '',
      profileSavedField: null,
      mainBoardId: '',
      saved: false,
      errorMessage: '',
      isHydrating: false,
    };
  }
  private readonly saveRequests$ = new Subject<string>();
  private readonly saveProfileRequests$ = new Subject<void>();
  private lastEditedProfileField: 'displayName' | 'username' | 'email' | null = null;
  /** SiteThemeService loads the profile, preferences and boards whenever the account changes. */
  readonly vm = computed(() => ({ boards: this.boardStore.boards(), ...this.state(), profile: this.userStore.profile() }));

  constructor() {
    effect(() => {
      const profile = this.userStore.profile();
      untracked(() => this.hydrate(profile));
    });
    effect(() => {
      const mainBoardId = this.userStore.mainBoardId();
      untracked(() => this.state.update(state => ({ ...state, mainBoardId: this.accountId ? mainBoardId : '' })));
    });

    this.saveRequests$
      .pipe(
        switchMap((mainBoardId) =>
          this.boardService.updateMyPreferences({ mainBoardId }).pipe(
            takeUntil(this.accountReset$),
            map((preferences) => ({ ok: true as const, preferences })),
            catchError((error) => of({ ok: false as const, error }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result.ok) {
          this.state.update(current => ({
            ...current,
            saved: false,
            profileSavedField: null,
            errorMessage: getApiErrorMessage(result.error, 'Unable to save main board'),
          }));
          return;
        }

        this.state.update(current => ({
          ...current,
          profileSavedField: null,
          mainBoardId: result.preferences.mainBoardId,
          saved: true,
          errorMessage: '',
          isHydrating: false,
        }));

        this.userStore.setMainBoardId(result.preferences.mainBoardId);
        this.boardStore.refreshBoards();
        timer(1200)
          .pipe(takeUntil(this.accountReset$), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            if (this.state().saved) this.state.update(current => ({ ...current, saved: false }));
          });
      });

    this.saveProfileRequests$
      .pipe(
        // Keep the request stream alive, but discard a queued edit when its account changes.
        switchMap(() => timer(600).pipe(takeUntil(this.accountReset$))),
        map(() => {
          const current = this.state();
          return {
            displayName: current.displayName.trim(),
            username: current.username.trim(),
            email: current.email.trim(),
          } satisfies UpdateUserProfileRequest;
        }),
        switchMap((payload) => {
          const missing = !payload.displayName || !payload.username
            ? 'displayName and username are required' : !payload.email ? 'Email is required' : '';
          if (missing) {
            return of({ ok: false as const, error: { error: { message: missing } } });
          }
          return this.userStore.updateMyProfile(payload).pipe(
            takeUntil(this.accountReset$),
            map((profile) => ({ ok: true as const, profile })),
            catchError((error) => of({ ok: false as const, error }))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result.ok) {
          this.state.update(current => ({
            ...current,
            profileSavedField: null,
            errorMessage: getApiErrorMessage(result.error, 'Unable to save profile'),
          }));
          return;
        }

        this.boardStore.refreshBoards();
        this.state.update(current => ({
          ...current,
          displayName: result.profile.displayName,
          username: result.profile.username,
          email: result.profile.email ?? '',
          profileSavedField: this.lastEditedProfileField,
          errorMessage: '',
          isHydrating: false,
        }));

        timer(1200)
          .pipe(takeUntil(this.accountReset$), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            if (this.state().profileSavedField) this.state.update(current => ({ ...current, profileSavedField: null }));
          });
      });
  }

  private hydrate(profile: UserProfile | null) {
    const id = profile?.userId ?? null;
    const changed = id !== this.accountId;
    if (changed || !profile) {
      this.accountReset$.next();
      this.accountId = id;
      this.lastEditedProfileField = null;
      this.state.set(this.emptyState());
    }
    if (!profile) return;
    this.state.update(current => ({
      ...current,
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email ?? '',
      isHydrating: false,
    }));
    if (changed) this.userStore.refreshMyPreferences();
  }

  signOut(): void {
    if (this.isSigningOut) return;
    this.isSigningOut = true;
    this.state.update(current => ({ ...current, errorMessage: '' }));
    this.authService.signout().pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => { this.isSigningOut = false; })
    ).subscribe({
      next: () => {
        this.isSigningOut = false;
        this.userStore.clearProfile();
        this.boardStore.clearBoards();
        void this.router.navigateByUrl('/signin');
      },
      error: (error) => {
        this.isSigningOut = false;
        this.state.update(current => ({
          ...current,
          errorMessage: getApiErrorMessage(error, 'Unable to sign out. Please try again.'),
        }));
      },
    });
  }

  onMainBoardChanged(mainBoardId: string) {
    if (!this.accountId) return;
    const current = this.state();
    this.state.set({ ...current, mainBoardId, saved: false, errorMessage: '' });

    if (current.isHydrating) {
      return;
    }
    this.saveRequests$.next(mainBoardId);
  }

  onProfileFieldChanged(field: 'displayName' | 'username' | 'email', value: string) {
    if (!this.accountId) return;
    this.lastEditedProfileField = field;
    const current = this.state();
    this.state.set({
      ...current,
      [field]: value,
      profileSavedField: null,
      errorMessage: '',
    });
    if (current.isHydrating) {
      return;
    }
    this.saveProfileRequests$.next();
  }
}
