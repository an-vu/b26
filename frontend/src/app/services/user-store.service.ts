import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { BoardService } from './board.service';
import type { UpdateUserProfileRequest, UserProfile } from '../models/board';

@Injectable({ providedIn: 'root' })
export class UserStoreService {
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  private readonly mainBoardIdSubject = new BehaviorSubject<string>('');
  readonly mainBoardId$ = this.mainBoardIdSubject.asObservable();
  private profileRequest?: Subscription;
  private preferencesRequest?: Subscription;
  private readonly sessionReset$ = new Subject<void>();

  constructor(private boardService: BoardService) {}

  refreshMyProfile(): void {
    this.profileRequest?.unsubscribe();
    this.profileRequest = this.boardService.getMyProfile().subscribe({
      next: (profile) => this.profileSubject.next(profile),
      error: () => this.profileSubject.next(null),
    });
  }

  refreshMyPreferences(): void {
    this.preferencesRequest?.unsubscribe();
    this.preferencesRequest = this.boardService.getMyPreferences().subscribe({
      next: (preferences) => this.mainBoardIdSubject.next(preferences.mainBoardId),
      error: () => this.mainBoardIdSubject.next(''),
    });
  }

  setMainBoardId(mainBoardId: string): void {
    this.preferencesRequest?.unsubscribe();
    this.mainBoardIdSubject.next(mainBoardId);
  }

  updateMyProfile(payload: UpdateUserProfileRequest): Observable<UserProfile> {
    return this.boardService.updateMyProfile(payload).pipe(
      takeUntil(this.sessionReset$),
      tap((profile) => this.profileSubject.next(profile))
    );
  }

  getCurrentProfile(): UserProfile | null {
    return this.profileSubject.value;
  }

  clearProfile(): void {
    this.profileRequest?.unsubscribe();
    this.preferencesRequest?.unsubscribe();
    this.sessionReset$.next();
    this.profileSubject.next(null);
    this.mainBoardIdSubject.next('');
  }
}
