import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { InsightsService } from '../../services/insights.service';
import { UserStoreService } from '../../services/user-store.service';
import { AuthService } from '../../services/auth.service';
import { BoardHeaderComponent } from '../../components/board-header/board-header';
import type { Board } from '../../models/board';
import type { SyncWidgetsRequest, Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';
import {
  buildWidgetPayload as buildWidgetPayloadHelper,
  createEmptyWidgetDraft as createEmptyWidgetDraftHelper,
  getWidgetValidationMessage as getWidgetValidationMessageHelper,
  normalizeHttpUrl as normalizeHttpUrlHelper,
  resetWidgetConfigForType as resetWidgetConfigForTypeHelper,
  toWidgetDraft as toWidgetDraftHelper,
  type WidgetDraft,
  type WidgetType,
  withNormalizedOrder as withNormalizedOrderHelper,
} from './board-page.widget-edit';
import {
  type AccountMenuBoard,
  type AccountMenuUser,
} from './board-page.account';
import { resolveBoardId$ as resolveBoardIdHelper$ } from './board-page.routing';
import {
  closeBoardIdentityMenuState,
  toggleBoardIdentityMenuState,
} from './board-page.identity-menu';
import { runPersistBoardUrlDraftAction } from './board-page.identity-actions';
import {
  buildCancelWidgetEditState,
  buildStartWidgetEditState,
} from './board-page.edit-session';
import { getTileLayoutClass } from '../../utils/widget-layout.util';
import {
  applyOnNewWidgetFieldChange,
  applyOnNewWidgetTypeChange,
  applyOnWidgetDraftFieldChange,
  applyOnWidgetTypeChange,
  getDraftValidationErrorState,
  runLoadBoardPermissions,
} from './board-page.ui-state';
import {
  applyAddNewWidgetAction,
  applyDeleteWidgetAction,
  applyMoveWidgetAction,
  applyOpenWidgetSettingsAction,
  buildWidgetPreviewFromDraft,
  isWidgetSettingsOpenAction,
} from './board-page.widget-actions';
import { initializeBoardPageAccountState } from './board-page.account-state';
import {
  runCreateNewBoardAction,
  runSignOutAction,
} from './board-page.account-actions';
import {
  getDocumentClickMenuCloseActions,
  getEscapeMenuCloseActions,
} from './board-page.overlay-menus';
import {
  createPageStateStream,
  createWidgetsStream,
  type BoardPageState,
} from './board-page.streams';
import { runDoneWidgetEditAdapter } from './board-page.save-flow-adapter';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BoardHeaderComponent, WidgetHostComponent],
  templateUrl: './board-page.html',
  styleUrl: './board-page.css',
})
export class BoardPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boardService = inject(BoardService);
  private boardStore = inject(BoardStoreService);
  private insightsService = inject(InsightsService);
  private userStore = inject(UserStoreService);
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private reload$ = new Subject<void>();
  private boardPermissionsRequestId = 0;

  isWidgetEditMode = false;
  isWidgetSaving = false;
  isAccountMenuOpen = false;
  accountBoardActionsMenuBoardId: string | null = null;
  isSigningOut = false;
  isSignedIn = false;
  isCreatingBoard = false;
  createBoardError = '';
  isBoardIdentityMenuOpen = false;
  canEditBoard = false;
  readOnlyView = false;
  widgetSaveError = '';
  newWidgetValidationError = '';
  isAddWidgetExpanded = false;
  boardDraftName = '';
  boardDraftHeadline = '';
  originalBoardName = '';
  originalBoardHeadline = '';
  boardIdentityNameDraft = '';
  boardIdentitySlugDraft = '';
  boardThemeToggleDraft = false;
  boardRadiusStepDraft: 1 | 2 | 3 = 2;
  boardBackgroundColorDraft = '#ffffff';
  boardPatternDraft: 'none' | 'dots' | 'grid' = 'none';
  widgetDrafts: WidgetDraft[] = [];
  activeWidgetSettingsId: number | null = null;
  newWidgetDraft: WidgetDraft = createEmptyWidgetDraftHelper();
  deletedWidgetIds: number[] = [];
  private originalWidgetDrafts = new Map<number, WidgetDraft>();
  private draftValidationErrors = new WeakMap<WidgetDraft, string>();
  private boardIdentitySourceId = '';
  private boardIdentityPersistedName = '';
  private boardIdentityPersistedUrl = '';
  private activeBoardUrl = '';
  private editingBoardUrl = '';

  get boardRadiusDraft() {
    return this.boardRadiusStepDraft === 1 ? 6 : this.boardRadiusStepDraft === 3 ? 24 : 12;
  }

  pageState$ = createPageStateStream({
    reload$: this.reload$,
    routeParamMap$: this.route.paramMap,
    resolveBoardId$: (routeParamBoardId, routeParamUsername) =>
      this.resolveBoardId$(routeParamBoardId, routeParamUsername),
    loadBoard: (boardId) => this.boardService.getBoard(boardId),
    recordBoardView: (boardId) => {
      this.insightsService.recordView(boardId, 'direct').subscribe({ error: () => { } });
    },
    onState: (state) => {
      if (state.status === 'ready') {
        this.loadBoardPermissions(state.board.boardUrl);
      } else {
        this.canEditBoard = false;
        this.activeBoardUrl = '';
      }

      if (state.status === 'ready' && state.board.id !== this.boardIdentitySourceId) {
        if (this.isWidgetEditMode) {
          this.cancelWidgetEdit();
        }
        this.boardIdentitySourceId = state.board.id;
        this.boardIdentityNameDraft = state.board.boardName || this.boardMenuLabel(state.board.id);
        this.boardIdentityPersistedName = this.boardIdentityNameDraft;
        this.boardIdentitySlugDraft = state.board.boardUrl;
        this.boardIdentityPersistedUrl = state.board.boardUrl;
      }
    },
  });

  widgets$ = createWidgetsStream({
    reload$: this.reload$,
    routeParamMap$: this.route.paramMap,
    resolveBoardId$: (routeParamBoardId, routeParamUsername) =>
      this.resolveBoardId$(routeParamBoardId, routeParamUsername),
    loadWidgets: (boardId) => this.boardService.getWidgets(boardId),
    onBoardResolved: (boardId) => {
      this.activeBoardUrl = boardId;
    },
  });

  trackWidget(index: number, widget: Widget) {
    return widget.id ?? index;
  }

  accountBoards: AccountMenuBoard[] = [];
  accountUser: AccountMenuUser = {
    name: 'Account',
    username: '@account',
  };
  accountMainBoardId = '';

  constructor() {
    initializeBoardPageAccountState({
      destroyRef: this.destroyRef,
      boardStore: this.boardStore,
      userStore: this.userStore,
      route: this.route,
      router: this.router,
      cdr: this.cdr,
      setAccountBoards: (boards) => {
        this.accountBoards = boards;
      },
      setSignedIn: (isSignedIn) => {
        this.isSignedIn = isSignedIn;
      },
      setAccountUser: (user) => {
        this.accountUser = user;
      },
      setAccountMainBoardId: (mainBoardId) => {
        this.accountMainBoardId = mainBoardId;
      },
      setReadOnlyView: (isReadOnly) => {
        this.readOnlyView = isReadOnly;
      },
    });
  }
  boardMenuLabel(boardId: string) {
    return this.accountBoards.find((board) => board.id === boardId)?.label ?? boardId;
  }

  isMainBoard(boardId: string) {
    return !!this.accountMainBoardId && this.accountMainBoardId === boardId;
  }

  tileLayoutClass(layout: string) {
    return getTileLayoutClass(layout);
  }

  startWidgetEdit(board: Board, widgets: Widget[]) {
    Object.assign(
      this,
      buildStartWidgetEditState({
        board,
        widgets,
        activeBoardUrl: this.activeBoardUrl,
        toWidgetDraft: (widget) => toWidgetDraftHelper(widget),
        createEmptyWidgetDraft: () => createEmptyWidgetDraftHelper(),
      })
    );
  }

  toggleAccountMenu() {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
    if (!this.isAccountMenuOpen) {
      this.accountBoardActionsMenuBoardId = null;
    }
  }

  closeAccountMenu() {
    this.isAccountMenuOpen = false;
    this.accountBoardActionsMenuBoardId = null;
  }

  toggleAccountBoardActionsMenu(boardId: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.accountBoardActionsMenuBoardId =
      this.accountBoardActionsMenuBoardId === boardId ? null : boardId;
  }

  closeAccountBoardActionsMenu() {
    this.accountBoardActionsMenuBoardId = null;
  }

  onAccountBoardSetMain(boardId: string, event: MouseEvent) {
    void boardId;
    event.stopPropagation();
    event.preventDefault();
    this.closeAccountBoardActionsMenu();
  }

  onAccountBoardDelete(boardId: string, event: MouseEvent) {
    void boardId;
    event.stopPropagation();
    event.preventDefault();
    this.closeAccountBoardActionsMenu();
  }

  createNewBoard() {
    runCreateNewBoardAction({
      isCreatingBoard: this.isCreatingBoard,
      setCreateBoardError: (message) => {
        this.createBoardError = message;
      },
      setCreatingBoard: (isCreating) => {
        this.isCreatingBoard = isCreating;
      },
      boardService: this.boardService,
      boardStore: this.boardStore,
      userStore: this.userStore,
      router: this.router,
      closeAccountMenu: () => this.closeAccountMenu(),
    });
  }

  signOut() {
    runSignOutAction({
      isSigningOut: this.isSigningOut,
      setSigningOut: (isSigningOut) => {
        this.isSigningOut = isSigningOut;
      },
      authService: this.authService,
      userStore: this.userStore,
      boardStore: this.boardStore,
      router: this.router,
      closeAccountMenu: () => this.closeAccountMenu(),
    });
  }

  toggleBoardIdentityMenu() {
    this.isBoardIdentityMenuOpen = toggleBoardIdentityMenuState(this.isBoardIdentityMenuOpen);
  }

  closeBoardIdentityMenu() {
    this.isBoardIdentityMenuOpen = closeBoardIdentityMenuState({
      persistBoardUrlDraft: () => this.persistBoardUrlDraft(),
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const actions = getDocumentClickMenuCloseActions({
      eventTarget: event.target,
      hostElement: this.elementRef.nativeElement,
      isAccountMenuOpen: this.isAccountMenuOpen,
      isBoardIdentityMenuOpen: this.isBoardIdentityMenuOpen,
    });

    if (actions.closeAccountMenu) {
      this.closeAccountMenu();
    }
    if (actions.closeBoardIdentityMenu) {
      this.closeBoardIdentityMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    const actions = getEscapeMenuCloseActions({
      isAccountMenuOpen: this.isAccountMenuOpen,
      isBoardIdentityMenuOpen: this.isBoardIdentityMenuOpen,
    });

    if (actions.closeAccountMenu) {
      this.closeAccountMenu();
    }
    if (actions.closeBoardIdentityMenu) {
      this.closeBoardIdentityMenu();
    }
  }

  cancelWidgetEdit() {
    Object.assign(this, buildCancelWidgetEditState(() => createEmptyWidgetDraftHelper()));
  }

  deleteWidget(draft: WidgetDraft) {
    const next = applyDeleteWidgetAction({
      draft,
      activeWidgetSettingsId: this.activeWidgetSettingsId,
      widgetDrafts: this.widgetDrafts,
      deletedWidgetIds: this.deletedWidgetIds,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
    });

    this.activeWidgetSettingsId = next.activeWidgetSettingsId;
    this.widgetDrafts = next.widgetDrafts;
    this.deletedWidgetIds = next.deletedWidgetIds;
  }

  addNewWidget() {
    const next = applyAddNewWidgetAction({
      newWidgetDraft: this.newWidgetDraft,
      widgetDrafts: this.widgetDrafts,
      getWidgetValidationMessage: (draft) => getWidgetValidationMessageHelper(draft),
      normalizeHttpUrl: (raw) => normalizeHttpUrlHelper(raw),
      createEmptyWidgetDraft: () => createEmptyWidgetDraftHelper(),
    });

    if (next.kind === 'invalid') {
      this.newWidgetValidationError = next.newWidgetValidationError;
      return;
    }

    this.widgetDrafts = next.widgetDrafts;
    this.newWidgetDraft = next.newWidgetDraft;
    this.widgetSaveError = next.widgetSaveError;
    this.newWidgetValidationError = next.newWidgetValidationError;
    this.isAddWidgetExpanded = next.isAddWidgetExpanded;
  }

  openAddWidgetForm() {
    this.isAddWidgetExpanded = true;
    this.newWidgetValidationError = '';
  }

  moveWidget(draft: WidgetDraft, direction: -1 | 1) {
    this.widgetDrafts = applyMoveWidgetAction({
      draft,
      direction,
      isWidgetSaving: this.isWidgetSaving,
      widgetDrafts: this.widgetDrafts,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
    });
  }

  openWidgetSettings(draft: WidgetDraft) {
    const nextId = applyOpenWidgetSettingsAction({
      draft,
      isWidgetSaving: this.isWidgetSaving,
    });

    if (nextId === null) {
      return;
    }

    this.activeWidgetSettingsId = nextId;
    this.draftValidationErrors.delete(draft);
  }

  isWidgetSettingsOpen(draft: WidgetDraft) {
    return isWidgetSettingsOpenAction({
      draft,
      activeWidgetSettingsId: this.activeWidgetSettingsId,
    });
  }

  widgetPreviewFromDraft(draft: WidgetDraft, index: number): Widget {
    return buildWidgetPreviewFromDraft({
      draft,
      index,
      buildWidgetPayload: (item) => buildWidgetPayloadHelper(item),
    });
  }

  doneWidgetEdit() {
    runDoneWidgetEditAdapter({
      activeBoardUrl: this.activeBoardUrl,
      editingBoardUrl: this.editingBoardUrl,
      widgetDrafts: this.widgetDrafts,
      boardDraftName: this.boardDraftName,
      boardDraftHeadline: this.boardDraftHeadline,
      originalBoardName: this.originalBoardName,
      originalBoardHeadline: this.originalBoardHeadline,
      originalWidgetDrafts: this.originalWidgetDrafts,
      boardService: this.boardService,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
      buildWidgetPayload: (draft) => buildWidgetPayloadHelper(draft),
      getWidgetValidationMessage: (draft) => getWidgetValidationMessageHelper(draft),
      applyWidgetDrafts: (drafts) => {
        this.widgetDrafts = drafts;
      },
      resetDraftValidationErrors: () => {
        this.draftValidationErrors = new WeakMap<WidgetDraft, string>();
      },
      setDraftValidationError: (draft, message) => {
        this.draftValidationErrors.set(draft, message);
      },
      setNewWidgetValidationError: (message) => {
        this.newWidgetValidationError = message;
      },
      setWidgetSaveError: (message) => {
        this.widgetSaveError = message;
      },
      setWidgetSaving: (saving) => {
        this.isWidgetSaving = saving;
      },
      onSaved: () => {
        this.cancelWidgetEdit();
        this.reload$.next();
      },
    });
  }

  onNewWidgetTypeChange() {
    this.newWidgetValidationError = applyOnNewWidgetTypeChange({
      newWidgetDraft: this.newWidgetDraft,
      resetWidgetConfigForType: (draft) => resetWidgetConfigForTypeHelper(draft),
    });
  }

  onWidgetTypeChange(draft: WidgetDraft) {
    applyOnWidgetTypeChange({
      draft,
      resetWidgetConfigForType: (item) => resetWidgetConfigForTypeHelper(item),
      draftValidationErrors: this.draftValidationErrors,
    });
  }

  onWidgetDraftFieldChange(draft: WidgetDraft) {
    this.widgetSaveError = applyOnWidgetDraftFieldChange({
      draft,
      draftValidationErrors: this.draftValidationErrors,
      widgetSaveError: this.widgetSaveError,
    });
  }

  onNewWidgetFieldChange() {
    this.newWidgetValidationError = applyOnNewWidgetFieldChange();
  }

  getDraftValidationError(draft: WidgetDraft) {
    return getDraftValidationErrorState({
      draft,
      draftValidationErrors: this.draftValidationErrors,
    });
  }

  private loadBoardPermissions(boardUrl: string) {
    const requestId = ++this.boardPermissionsRequestId;
    runLoadBoardPermissions({
      boardService: this.boardService,
      boardUrl,
      onCanEditChange: (canEdit) => {
        if (requestId !== this.boardPermissionsRequestId) {
          return;
        }
        this.canEditBoard = canEdit;
        this.cdr.markForCheck();
      },
    });
  }

  private persistBoardUrlDraft() {
    runPersistBoardUrlDraftAction({
      boardService: this.boardService,
      boardStore: this.boardStore,
      router: this.router,
      route: this.route,
      boardIdentityPersistedUrl: this.boardIdentityPersistedUrl,
      boardIdentityNameDraft: this.boardIdentityNameDraft,
      boardIdentitySlugDraft: this.boardIdentitySlugDraft,
      boardIdentityPersistedName: this.boardIdentityPersistedName,
      setIdentityDraft: (boardName, boardUrl) => {
        this.boardIdentityNameDraft = boardName;
        this.boardIdentitySlugDraft = boardUrl;
      },
      setIdentityPersistedAndDraft: (boardName, boardUrl) => {
        this.boardIdentityPersistedName = boardName;
        this.boardIdentityPersistedUrl = boardUrl;
        this.boardIdentityNameDraft = boardName;
        this.boardIdentitySlugDraft = boardUrl;
      },
    });
  }

  private resolveBoardId$(routeParamBoardId: string | null, routeParamUsername: string | null) {
    return resolveBoardIdHelper$({
      boardService: this.boardService,
      routeParamBoardId,
      routeParamUsername,
      dataBoardId: this.route.snapshot?.data?.["boardId"],
      systemRoute: this.route.snapshot?.data?.["systemRoute"],
      userMainRoute: !!this.route.snapshot?.data?.["userMainRoute"],
    });
  }

}
