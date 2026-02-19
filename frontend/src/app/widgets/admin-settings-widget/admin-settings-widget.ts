import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Widget } from '../../models/widget';
import type { UpdateSystemRoutesRequest } from '../../models/board';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';
import type { SystemRoutes } from '../../models/board';

type SavedField = 'homepage' | 'insights' | 'settings' | 'signin' | 'signup' | null;

type AdminSettingsState = {
  homepageBoardId: string;
  insightsBoardId: string;
  settingsBoardId: string;
  signinBoardId: string;
  signupBoardId: string;
  savedField: SavedField;
  errorMessage: string;
  isHydrating: boolean;
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
  readonly boards$;
  private readonly state$ = new BehaviorSubject<AdminSettingsState>({
    homepageBoardId: '',
    insightsBoardId: '',
    settingsBoardId: '',
    signinBoardId: '',
    signupBoardId: '',
    savedField: null,
    errorMessage: '',
    isHydrating: true,
  });
  private readonly saveRequests$ = new Subject<{
    field: Exclude<SavedField, null>;
    payload: UpdateSystemRoutesRequest;
  }>();
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
          });
          return;
        }

        this.state$.next({
          ...this.routesToState(result.routes, this.state$.value),
          savedField: result.field,
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
    this.boardStore.refreshBoards();
    this.boardService
      .getSystemRoutes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routes) => {
          this.state$.next({
            ...this.routesToState(routes, this.state$.value),
            savedField: null,
            errorMessage: '',
            isHydrating: false,
          });
        },
        error: () => {
          this.state$.next({
            homepageBoardId: '',
            insightsBoardId: '',
            settingsBoardId: '',
            signinBoardId: '',
            signupBoardId: '',
            savedField: null,
            errorMessage: '',
            isHydrating: false,
          });
        },
      });
  }

  onRouteSelectionChanged(field: Exclude<SavedField, null>, boardId: string) {
    const current = this.state$.value;
    const next = this.withFieldChanged(current, field, boardId);
    this.state$.next({ ...next, errorMessage: '', savedField: null });

    if (
      next.isHydrating ||
      !next.homepageBoardId ||
      !next.insightsBoardId ||
      !next.settingsBoardId ||
      !next.signinBoardId ||
      !next.signupBoardId
    ) {
      return;
    }

    this.saveRequests$.next({
      field,
      payload: {
        globalHomepageBoardId: next.homepageBoardId,
        globalInsightsBoardId: next.insightsBoardId,
        globalSettingsBoardId: next.settingsBoardId,
        globalSigninBoardId: next.signinBoardId || 'signin',
        globalSignupBoardId: next.signupBoardId || 'signup',
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
    if (field === 'signin') {
      return { ...state, signinBoardId: boardId };
    }
    return { ...state, signupBoardId: boardId };
  }

  private routesToState(
    routes: SystemRoutes,
    current: AdminSettingsState
  ): Pick<AdminSettingsState, 'homepageBoardId' | 'insightsBoardId' | 'settingsBoardId' | 'signinBoardId' | 'signupBoardId'> {
    return {
      homepageBoardId: routes.globalHomepageBoardId || current.homepageBoardId || 'home',
      insightsBoardId: routes.globalInsightsBoardId || current.insightsBoardId || 'insights',
      settingsBoardId: routes.globalSettingsBoardId || current.settingsBoardId || 'settings',
      signinBoardId:
        routes.globalSigninBoardId ||
        routes.globalLoginBoardId ||
        current.signinBoardId ||
        'signin',
      signupBoardId:
        routes.globalSignupBoardId ||
        current.signupBoardId ||
        'signup',
    };
  }
}
