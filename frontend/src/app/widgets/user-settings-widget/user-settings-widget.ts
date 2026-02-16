import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Widget } from '../../models/widget';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';

type UserSettingsState = {
  username: string;
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
    username: 'username',
    mainBoardId: '',
    saved: false,
    errorMessage: '',
    isHydrating: true,
  });
  private readonly saveRequests$ = new Subject<string>();
  readonly vm$;

  constructor(
    private boardStore: BoardStoreService,
    private boardService: BoardService
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
            errorMessage: result.error?.error?.message ?? 'Unable to save main board',
          });
          return;
        }

        this.state$.next({
          username: result.preferences.username,
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
  }

  ngOnInit() {
    this.boardStore.refreshBoards();
    this.boardService
      .getMyPreferences()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preferences) => {
          this.state$.next({
            username: preferences.username,
            mainBoardId: preferences.mainBoardId,
            saved: false,
            errorMessage: '',
            isHydrating: false,
          });
        },
        error: () => {
          this.state$.next({
            username: 'username',
            mainBoardId: '',
            saved: false,
            errorMessage: '',
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
}
