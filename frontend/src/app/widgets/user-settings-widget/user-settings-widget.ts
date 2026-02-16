import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
  profileSaved: boolean;
  mainBoardId: string;
  saved: boolean;
  errorMessage: string;
  isHydrating: boolean;
};

@Component({
  selector: 'app-user-settings-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-settings-widget.html',
  styleUrl: './user-settings-widget.css',
})
export class UserSettingsWidgetComponent implements OnInit {
  @Input({ required: true }) widget!: Widget;

  private readonly destroyRef = inject(DestroyRef);
  readonly boards$;
  private readonly state$ = new BehaviorSubject<UserSettingsState>({
    displayName: '',
    username: 'username',
    email: '',
    profileSaved: false,
    mainBoardId: '',
    saved: false,
    errorMessage: '',
    isHydrating: true,
  });
  private readonly saveRequests$ = new Subject<string>();
  private readonly saveProfileRequests$ = new Subject<UpdateUserProfileRequest>();
  readonly vm$;

  constructor(
    private boardStore: BoardStoreService,
    private boardService: BoardService,
    private userStore: UserStoreService
  ) {
    this.boards$ = this.boardStore.boards$;
    this.vm$ = combineLatest([this.boards$, this.state$]).pipe(
      map(([boards, state]) => ({ boards, ...state }))
    );

    this.saveRequests$
      .pipe(
        switchMap((mainBoardId) =>
          this.boardService.updateMyPreferences({ mainBoardId }).pipe(
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
            profileSaved: false,
            errorMessage: result.error?.error?.message ?? 'Unable to save main board',
          });
          return;
        }

        this.state$.next({
          username: result.preferences.username,
          displayName: this.state$.value.displayName,
          email: this.state$.value.email,
          profileSaved: false,
          mainBoardId: result.preferences.mainBoardId,
          saved: true,
          errorMessage: '',
          isHydrating: false,
        });

        timer(1200)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const current = this.state$.value;
            if (current.saved) {
              this.state$.next({ ...current, saved: false });
            }
          });
      });

    this.saveProfileRequests$
      .pipe(
        switchMap((payload) =>
          this.userStore.updateMyProfile(payload).pipe(
            map((profile) => ({ ok: true as const, profile })),
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
            profileSaved: false,
            errorMessage: result.error?.error?.message ?? 'Unable to save profile',
          });
          return;
        }

        this.state$.next({
          ...this.state$.value,
          displayName: result.profile.displayName,
          username: result.profile.username,
          email: result.profile.email ?? '',
          profileSaved: true,
          errorMessage: '',
          isHydrating: false,
        });

        timer(1200)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const current = this.state$.value;
            if (current.profileSaved) {
              this.state$.next({ ...current, profileSaved: false });
            }
          });
      });
  }

  ngOnInit() {
    this.boardStore.refreshBoards();
    this.userStore.refreshMyProfile();
    const currentProfile = this.userStore.getCurrentProfile();
    if (currentProfile) {
      const current = this.state$.value;
      this.state$.next({
        ...current,
        displayName: currentProfile.displayName,
        username: currentProfile.username,
        email: currentProfile.email ?? '',
      });
    }
    this.userStore.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        if (!profile) {
          return;
        }
        const current = this.state$.value;
        this.state$.next({
          ...current,
          displayName: profile.displayName,
          username: profile.username,
          email: profile.email ?? '',
          isHydrating: false,
        });
      });
    this.boardService
      .getMyPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preferences) => {
          const current = this.state$.value;
          this.state$.next({
            ...current,
            username: preferences.username,
            mainBoardId: preferences.mainBoardId,
            saved: false,
            profileSaved: false,
            isHydrating: false,
          });
        },
        error: () => {
          const current = this.state$.value;
          this.state$.next({
            ...current,
            isHydrating: false,
          });
        },
      });
  }

  onMainBoardChanged(mainBoardId: string) {
    const current = this.state$.value;
    this.state$.next({ ...current, mainBoardId, saved: false, errorMessage: '' });

    if (current.isHydrating || !mainBoardId) {
      return;
    }
    this.saveRequests$.next(mainBoardId);
  }

  onProfileFieldChanged(field: 'displayName' | 'username' | 'email', value: string) {
    const current = this.state$.value;
    this.state$.next({
      ...current,
      [field]: value,
      profileSaved: false,
      errorMessage: '',
    });
  }

  saveProfileIfNeeded() {
    const current = this.state$.value;
    if (current.isHydrating) {
      return;
    }
    const payload: UpdateUserProfileRequest = {
      displayName: current.displayName.trim(),
      username: current.username.trim(),
      email: current.email.trim() || null,
    };
    if (!payload.displayName || !payload.username) {
      return;
    }
    this.saveProfileRequests$.next(payload);
  }
}
