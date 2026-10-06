import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, forkJoin, of, Subject, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Widget } from '../../models/widget';
import type { Board, UpdateSystemRoutesRequest } from '../../models/board';
import { BoardService } from '../../services/board.service';
import type { SystemRoutes } from '../../models/board';

type SavedField = 'homepage' | 'insights' | 'settings' | 'signin' | null;

type AdminSettingsState = {
  homepageBoardId: string;
  insightsBoardId: string;
  settingsBoardId: string;
  signinBoardId: string;
  savedField: SavedField;
  errorMessage: string;
  isHydrating: boolean;
  loadFailed: boolean;
  isSaving: boolean;
};

@Component({
  selector: 'app-admin-settings-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings-widget.html',
  styleUrl: './admin-settings-widget.css',
})
export class AdminSettingsWidgetComponent implements OnInit {
  @Input({ required: true }) widget!: Widget;

  private readonly destroyRef = inject(DestroyRef);
  private readonly boardsSubject = new BehaviorSubject<Board[]>([]);
  readonly boards$ = this.boardsSubject.asObservable();
  private readonly state$ = new BehaviorSubject<AdminSettingsState>({
    homepageBoardId: '',
    insightsBoardId: '',
    settingsBoardId: '',
    signinBoardId: '',
    savedField: null,
    errorMessage: '',
    isHydrating: true,
    loadFailed: false,
    isSaving: false,
  });
  private readonly saveRequests$ = new Subject<{
    field: Exclude<SavedField, null>;
    payload: UpdateSystemRoutesRequest;
  }>();
  readonly vm$;

  constructor(
    private boardService: BoardService
  ) {
    this.vm$ = combineLatest([this.boards$, this.state$]).pipe(
      map(([boards, state]) => ({ boards, ...state }))
    );

    this.saveRequests$
      .pipe(
        switchMap(({ field, payload }) =>
          this.boardService.updateSystemRoutes(payload).pipe(
            map((routes) => ({ ok: true as const, field, routes })),
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
            errorMessage: result.error?.error?.message ?? 'Unable to save route settings',
            savedField: null,
            isSaving: false,
          });
          return;
        }

        this.state$.next({
          ...this.state$.value,
          ...this.routesToState(result.routes, this.state$.value),
          savedField: result.field,
          isSaving: false,
          errorMessage: '',
          isHydrating: false,
        });

        timer(1200)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            const current = this.state$.value;
            if (current.savedField === result.field) {
              this.state$.next({ ...current, savedField: null });
            }
          });
      });
  }

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings(): void {
    if (this.state$.value.isSaving) return;
    this.state$.next({
      ...this.state$.value,
      isHydrating: true,
      loadFailed: false,
      savedField: null,
      errorMessage: '',
    });
    // Route mappings may point to any board, not just the current admin's boards.
    forkJoin({
      boards: this.boardService.getBoards(),
      routes: this.boardService.getSystemRoutes(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ boards, routes }) => {
        this.boardsSubject.next(boards);
        this.state$.next({
          ...this.state$.value,
          ...this.routesToState(routes, this.state$.value),
          isHydrating: false,
          loadFailed: false,
          errorMessage: '',
        });
      },
      error: () => {
        this.state$.next({
          ...this.state$.value,
          isHydrating: false,
          loadFailed: true,
          errorMessage: 'Unable to load boards and route settings. Please retry.',
        });
      },
    });
  }

  onRouteSelectionChanged(field: Exclude<SavedField, null>, boardId: string) {
    const current = this.state$.value;
    if (current.isHydrating || current.loadFailed || current.isSaving) return;
    const next = this.withFieldChanged(current, field, boardId);
    this.state$.next({ ...next, errorMessage: '', savedField: null });

    if (
      next.isHydrating ||
      !next.homepageBoardId ||
      !next.insightsBoardId ||
      !next.settingsBoardId ||
      !next.signinBoardId
    ) {
      return;
    }

    this.state$.next({ ...this.state$.value, isSaving: true });
    this.saveRequests$.next({
      field,
      payload: {
        globalHomepageBoardId: next.homepageBoardId,
        globalInsightsBoardId: next.insightsBoardId,
        globalSettingsBoardId: next.settingsBoardId,
        globalSigninBoardId: next.signinBoardId || 'signin',
      },
    });
  }

  private withFieldChanged(
    state: AdminSettingsState,
    field: Exclude<SavedField, null>,
    boardId: string
  ): AdminSettingsState {
    if (field === 'homepage') {
      return { ...state, homepageBoardId: boardId };
    }
    if (field === 'insights') {
      return { ...state, insightsBoardId: boardId };
    }
    if (field === 'settings') {
      return { ...state, settingsBoardId: boardId };
    }
    return { ...state, signinBoardId: boardId };
  }

  private routesToState(
    routes: SystemRoutes,
    current: AdminSettingsState
  ): Pick<AdminSettingsState, 'homepageBoardId' | 'insightsBoardId' | 'settingsBoardId' | 'signinBoardId'> {
    return {
      homepageBoardId: routes.globalHomepageBoardId || current.homepageBoardId || 'home',
      insightsBoardId: routes.globalInsightsBoardId || current.insightsBoardId || 'insights',
      settingsBoardId: routes.globalSettingsBoardId || current.settingsBoardId || 'settings',
      signinBoardId:
        routes.globalSigninBoardId ||
        routes.globalLoginBoardId ||
        current.signinBoardId ||
        'signin',
    };
  }
}
