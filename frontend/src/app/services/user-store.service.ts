import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { BoardService } from './board.service';
import type { UpdateUserProfileRequest, UserProfile } from '../models/board';

/** The signed-in account's profile and main board, loaded by SiteThemeService on account change. */
@Injectable({ providedIn: 'root' })
export class UserStoreService {
  private readonly boardService = inject(BoardService);
  private readonly profileState = signal<UserProfile | null>(null);
  private readonly mainBoardIdState = signal('');
  private profileRequest?: Subscription;
  private preferencesRequest?: Subscription;
  private readonly sessionReset$ = new Subject<void>();

  readonly profile = this.profileState.asReadonly();
  readonly mainBoardId = this.mainBoardIdState.asReadonly();

  refreshMyProfile(): void {
    this.profileRequest?.unsubscribe();
    this.profileRequest = this.boardService.getMyProfile().subscribe({
      next: (profile) => this.profileState.set(profile),
      error: () => this.profileState.set(null),
    });
  }

  refreshMyPreferences(): void {
    this.preferencesRequest?.unsubscribe();
    this.preferencesRequest = this.boardService.getMyPreferences().subscribe({
      next: (preferences) => this.mainBoardIdState.set(preferences.mainBoardId),
      error: () => this.mainBoardIdState.set(''),
    });
  }

  setMainBoardId(mainBoardId: string): void {
    this.preferencesRequest?.unsubscribe();
    this.mainBoardIdState.set(mainBoardId);
  }

  updateMyProfile(payload: UpdateUserProfileRequest): Observable<UserProfile> {
    return this.boardService.updateMyProfile(payload).pipe(
      takeUntil(this.sessionReset$),
      tap((profile) => this.profileState.set(profile)),
    );
  }

  clearProfile(): void {
    this.profileRequest?.unsubscribe();
    this.preferencesRequest?.unsubscribe();
    this.sessionReset$.next();
    this.profileState.set(null);
    this.mainBoardIdState.set('');
  }
}
