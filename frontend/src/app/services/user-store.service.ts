import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BoardService } from './board.service';
import type { UpdateUserProfileRequest, UserProfile } from '../models/board';

@Injectable({ providedIn: 'root' })
export class UserStoreService {
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  private readonly mainBoardIdSubject = new BehaviorSubject<string>('');
  readonly mainBoardId$ = this.mainBoardIdSubject.asObservable();

  constructor(private boardService: BoardService) {}

  refreshMyProfile(): void {
    this.boardService.getMyProfile().subscribe({
      next: (profile) => this.profileSubject.next(profile),
      error: () => this.profileSubject.next(null),
    });
  }

  refreshMyPreferences(): void {
    this.boardService.getMyPreferences().subscribe({
      next: (preferences) => this.mainBoardIdSubject.next(preferences.mainBoardId),
      error: () => this.mainBoardIdSubject.next(''),
    });
  }

  setMainBoardId(mainBoardId: string): void {
    this.mainBoardIdSubject.next(mainBoardId);
  }

  updateMyProfile(payload: UpdateUserProfileRequest): Observable<UserProfile> {
    return this.boardService.updateMyProfile(payload).pipe(
      tap((profile) => this.profileSubject.next(profile))
    );
  }

  getCurrentProfile(): UserProfile | null {
    return this.profileSubject.value;
  }

  clearProfile(): void {
    this.profileSubject.next(null);
    this.mainBoardIdSubject.next('');
  }
}
