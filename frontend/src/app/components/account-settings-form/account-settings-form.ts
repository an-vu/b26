import { boardRoute } from '../../models/board-route';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject, timer } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Widget } from '../../models/widget';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';
import { UserStoreService } from '../../services/user-store.service';
import type { UpdateUserProfileRequest } from '../../models/board';

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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-settings-form.html',
  styleUrl: './account-settings-form.css',
})
export class AccountSettingsFormComponent implements OnInit {
  @Input() showMainBoard = true;
  readonly boardRoute = boardRoute;
  @Input() widget?: Widget;

  private readonly destroyRef = inject(DestroyRef);
  readonly boards$;
  isSigningOut = false;
  private readonly state$ = new BehaviorSubject<UserSettingsState>(this.emptyState());
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
  readonly vm$;

  constructor(
    private boardStore: BoardStoreService,
    private boardService: BoardService,
    private userStore: UserStoreService,
    private authService: AuthService,
    private router: Router
  ) {
    this.boards$ = this.boardStore.boards$;
    this.vm$ = combineLatest([this.boards$, this.state$, this.userStore.profile$]).pipe(
      map(([boards, state, profile]) => ({ boards, ...state, profile }))
    );

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
          const current = this.state$.value;
          this.state$.next({
            ...current,
            saved: false,
            profileSavedField: null,
            errorMessage: result.error?.error?.message ?? 'Unable to save main board',
          });
          return;
        }

        this.state$.next({
          ...this.state$.value,
          profileSavedField: null,
          mainBoardId: result.preferences.mainBoardId,
          saved: true,
          errorMessage: '',
          isHydrating: false,
        });

        this.userStore.setMainBoardId(result.preferences.mainBoardId);
        this.boardStore.refreshBoards();
        timer(1200)
          .pipe(takeUntil(this.accountReset$), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const current = this.state$.value;
            if (current.saved) {
              this.state$.next({ ...current, saved: false });
            }
          });
      });

    this.saveProfileRequests$
      .pipe(
        // Keep the request stream alive, but discard a queued edit when its account changes.
        switchMap(() => timer(600).pipe(takeUntil(this.accountReset$))),
        map(() => {
          const current = this.state$.value;
          return {
            displayName: current.displayName.trim(),
            username: current.username.trim(),
            email: current.email.trim() || null,
          } as UpdateUserProfileRequest;
        }),
        switchMap((payload) => {
          if (!payload.displayName || !payload.username) {
            return of({
              ok: false as const,
              error: { error: { message: 'displayName and username are required' } },
            });
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
          const current = this.state$.value;
          this.state$.next({
            ...current,
            profileSavedField: null,
            errorMessage: getApiErrorMessage(result.error, 'Unable to save profile'),
          });
          return;
        }

        this.boardStore.refreshBoards();
        this.state$.next({
          ...this.state$.value,
          displayName: result.profile.displayName,
          username: result.profile.username,
          email: result.profile.email ?? '',
          profileSavedField: this.lastEditedProfileField,
          errorMessage: '',
          isHydrating: false,
        });

        timer(1200)
          .pipe(takeUntil(this.accountReset$), takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const current = this.state$.value;
            if (current.profileSavedField) {
              this.state$.next({ ...current, profileSavedField: null });
            }
          });
      });
  }

  ngOnInit() {
    this.userStore.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        const id = profile?.userId ?? null;
        const changed = id !== this.accountId;
        if (changed || !profile) {
          this.accountReset$.next();
          this.accountId = id;
          this.lastEditedProfileField = null;
          this.state$.next(this.emptyState());
        }
        if (!profile) return;
        this.state$.next({
          ...this.state$.value,
          displayName: profile.displayName,
          username: profile.username,
          email: profile.email ?? '',
          isHydrating: false,
        });
        if (changed) this.userStore.refreshMyPreferences();
      });
    this.userStore.mainBoardId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mainBoardId => {
        this.state$.next({ ...this.state$.value, mainBoardId: this.accountId ? mainBoardId : '' });
      });
    this.boardStore.refreshBoards();
    this.userStore.refreshMyProfile();
  }

  signOut(): void {
    if (this.isSigningOut) return;
    this.isSigningOut = true;
    this.state$.next({ ...this.state$.value, errorMessage: '' });
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
        this.state$.next({
          ...this.state$.value,
          errorMessage: getApiErrorMessage(error, 'Unable to sign out. Please try again.'),
        });
      },
    });
  }

  onMainBoardChanged(mainBoardId: string) {
    if (!this.accountId) return;
    const current = this.state$.value;
    this.state$.next({ ...current, mainBoardId, saved: false, errorMessage: '' });

    if (current.isHydrating) {
      return;
    }
    this.saveRequests$.next(mainBoardId);
  }

  onProfileFieldChanged(field: 'displayName' | 'username' | 'email', value: string) {
    if (!this.accountId) return;
    this.lastEditedProfileField = field;
    const current = this.state$.value;
    this.state$.next({
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
