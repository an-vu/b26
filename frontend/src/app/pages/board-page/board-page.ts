import { PanelComponent } from '../../components/panel/panel';
import { WidgetLibraryComponent } from './widget-library/widget-library';
import { widgetCornerRadius, widgetCornerInset } from '../../utils/widget-corner.util';
import { paperColor, foregroundColor } from '../../themes/appearance-values';
import { BoardProfileComponent } from './board-profile/board-profile';
import { BoardSettingsComponent } from './board-settings/board-settings';
import { WidgetEditorComponent } from './widget-editor/widget-editor';
import type { PanelDismissReason } from '../../directives/panel-behavior';
import { IconComponent } from '../../components/icon/icon';
import { SiteNavigationComponent } from '../../components/site-navigation/site-navigation';
import { SiteThemeService } from '../../services/site-theme.service';
import { WidgetBounceDirective } from '../../directives/widget-bounce';
import { BoardAtmosphereComponent } from '../../components/board-atmosphere/board-atmosphere';
import { BOARD_THEMES, BoardThemeId } from '../../themes/board-theme';
import { BoardAppearance } from '../../models/board';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, inject, afterNextRender, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, combineLatest, distinctUntilChanged, finalize, map, takeUntil } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { hasDraftChangedByOriginal, runDoneWidgetEdit } from './board-page.save-flow';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { Router } from '@angular/router';

import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { InsightsService } from '../../services/insights.service';
import { UserStoreService } from '../../services/user-store.service';
import { AuthService } from '../../services/auth.service';
import type { Board } from '../../models/board';
import type { Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';
import {
  buildWidgetPayload as buildWidgetPayloadHelper,
  createEmptyWidgetDraft as createEmptyWidgetDraftHelper,
  getWidgetValidationMessage as getWidgetValidationMessageHelper,
  resetWidgetConfigForType as resetWidgetConfigForTypeHelper,
  toWidgetDraft as toWidgetDraftHelper,
  type WidgetDraft,
  withNormalizedOrder as withNormalizedOrderHelper,
} from './board-page.widget-edit';
import {
  type AccountMenuBoard,
  type AccountMenuUser,
} from './board-page.account';
import { boardRoute } from '../../models/board-route';
import { resolveBoardId$ as resolveBoardIdHelper$ } from './board-page.routing';
import { prepareBoardIdentityUpdate } from './board-page.routing';
import {
  buildCancelWidgetEditState,
  buildStartWidgetEditState,
} from './board-page.edit-session';
import { getTileLayoutClass } from '../../utils/widget-layout.util';
import {
  applyOnWidgetDraftFieldChange,
  applyOnWidgetTypeChange,
  getDraftValidationErrorState,
} from './board-page.ui-state';
import {
  applyDeleteWidgetAction,
  applyMoveWidgetAction,
  buildWidgetPreviewFromDraft,
} from './board-page.widget-actions';
import { initializeBoardPageAccountState } from './board-page.account-state';
import {
  runCreateNewBoardAction,
  runDeleteBoardAction,
} from './board-page.account-actions';
import {
  createPageStateStream,
  createWidgetsStream,
} from './board-page.streams';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [PanelComponent, WidgetLibraryComponent, BoardProfileComponent, BoardSettingsComponent, WidgetEditorComponent, IconComponent, SiteNavigationComponent, WidgetBounceDirective, BoardAtmosphereComponent, CommonModule, WidgetHostComponent],
  templateUrl: './board-page.html',
  styleUrls: [
    './board-page.layout.css', './board-page.grid.css', './board-page.widget-edit.css',
  ],
})
export class BoardPageComponent {
  onAppearanceChange(appearance: BoardAppearance) {
    if (!this.canEditBoard || this.readOnlyView) return;
    this.applyAppearance(appearance);
    this.saveSettingsAutomatically();
  }
  readonly boardRoute = boardRoute;
  readonly siteTheme = inject(SiteThemeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boardService = inject(BoardService);
  private boardStore = inject(BoardStoreService);
  readonly boardNotice$ = this.boardStore.notice$;
  boardDeleteError = '';

  dismissBoardNotice() {
    this.boardStore.setNotice('');
  }
  private insightsService = inject(InsightsService);
  private userStore = inject(UserStoreService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private reload$ = new Subject<void>();
  private readonly accessReset$ = new Subject<void>();
  private permissionsRequest?: Subscription;
  private readonly routeContext$ = combineLatest([
    this.route.paramMap,
    inject(AuthService).user$.pipe(
      map(user => user ? `${user.id}:${user.role}` : ''), distinctUntilChanged()
    ),
  ]).pipe(map(([params]) => params));

  identitySaveError = '';
  isIdentitySaving = false;
  private identityVersion: number | undefined;
  isWidgetLoading = false;
  isSettingMainBoard = false;
  private editVersion: number | null = null;
  isWidgetEditMode = false;
  isWidgetSaving = false;
  isAccountMenuOpen = false;
  accountBoardActionsMenuBoardId: string | null = null;
  isSignedIn = false;
  isCreatingBoard = false;
  isDeletingBoard = false;
  deletingBoardUrl = '';
  accountActionError = '';
  isBoardIdentityMenuOpen = false;
  isSettingsReloading = false;
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private noticeText = '';
  get settingsNotice() { return this.noticeText; }
  set settingsNotice(value: string) {
    clearTimeout(this.noticeTimer);
    this.noticeText = value;
    if (value) this.noticeTimer = setTimeout(() => { this.noticeText = ''; this.cdr.markForCheck(); }, 3000);
  }
  isBoardSwitcherOpen = false;
  pendingDeleteBoardUrl: string | null = null;
  pendingDeleteBoardLabel = '';
  toggleBoardSwitcher() {
    this.pendingDeleteBoardUrl = null;
    this.isBoardSwitcherOpen = !this.isBoardSwitcherOpen;
  }

  cancelBoardDelete() {
    if (!this.isDeletingBoard) this.pendingDeleteBoardUrl = null;
  }

  switchToBoard(route: string) {
    if (!this.canLeaveBoard()) return;
    this.closeBoardIdentityMenu();
    void this.router.navigateByUrl(route);
  }

  canEditBoard = false;
  readOnlyView = false;
  widgetSaveError = '';
  boardDraftName = '';
  boardDraftHeadline = '';
  profileNameDraft = '';
  private originalProfileName = '';
  boardDraftWebsite = '';
  private originalBoardWebsite = '';
  originalBoardName = '';
  originalBoardHeadline = '';
  boardIdentityNameDraft = '';
  boardIdentitySlugDraft = '';
  boardThemeFamilyDraft: BoardThemeId = 'default';
  get boardTheme() {
    return BOARD_THEMES.find(theme => theme.id === this.boardThemeFamilyDraft) ?? BOARD_THEMES[0];
  }
  boardThemeToggleDraft = false;
  boardRadiusStepDraft: BoardAppearance['radiusStep'] = 2;
  boardSpacingStepDraft: 1 | 2 | 3 = 2;
  boardBackgroundColorDraft = '#f9f8f6';
  boardPatternDraft: BoardAppearance['pattern'] = 'none';
  boardPatternIntensityDraft: NonNullable<BoardAppearance['patternIntensity']> = 'light';
  widgetDrafts: WidgetDraft[] = [];
  activeWidgetSettingsId: number | null = null;
  private activeNewWidgetDraft: WidgetDraft | null = null;
  private originalWidgetDrafts = new Map<number, WidgetDraft>();
  private draftValidationErrors = new WeakMap<WidgetDraft, string>();
  private persistedAppearance: BoardAppearance = this.defaultAppearance();

  defaultAppearance(): BoardAppearance {
    return { spacingStep: 2, patternIntensity: 'light', themeFamily: 'default', theme: 'light', radiusStep: 2, backgroundColor: '#f9f8f6', pattern: 'none' };
  }

  get boardDisplayBackground(): string { return paperColor(this.boardBackgroundColorDraft); }
  get boardDisplayText(): string { return foregroundColor(this.boardBackgroundColorDraft); }

  get appearanceDraft(): BoardAppearance {
    return { themeFamily: this.boardThemeFamilyDraft, theme: this.boardThemeToggleDraft ? 'dark' : 'light',
      spacingStep: Number(this.boardSpacingStepDraft) as 1 | 2 | 3,
      radiusStep: Number(this.boardRadiusStepDraft) as BoardAppearance['radiusStep'],
      backgroundColor: this.boardBackgroundColorDraft, pattern: this.boardPatternDraft, patternIntensity: this.boardPatternIntensityDraft };
  }

  get appearanceChanged(): boolean {
    const draft = this.appearanceDraft;
    const saved = this.persistedAppearance;
    return draft.spacingStep !== (saved.spacingStep ?? 2) || draft.themeFamily !== (saved.themeFamily ?? 'default') || draft.theme !== saved.theme || draft.radiusStep !== saved.radiusStep ||
      draft.backgroundColor !== saved.backgroundColor || draft.pattern !== saved.pattern ||
      draft.patternIntensity !== (saved.patternIntensity ?? 'light');
  }

  applyAppearance(appearance: BoardAppearance) {
    this.boardThemeFamilyDraft = BOARD_THEMES.find(theme => theme.id === appearance.themeFamily && theme.status === 'available')?.id ?? 'default';
    this.boardThemeToggleDraft = appearance.theme === 'dark';
    this.boardRadiusStepDraft = appearance.radiusStep;
    this.boardSpacingStepDraft = appearance.spacingStep ?? 2;
    this.boardBackgroundColorDraft = appearance.backgroundColor;
    this.boardPatternDraft = appearance.pattern;
    this.boardPatternIntensityDraft = appearance.patternIntensity ?? 'light';
  }

  hydrateAppearance(board: Board) {
    this.persistedAppearance = { ...this.defaultAppearance(), ...board.appearance };
    if (this.persistedAppearance.pattern === 'dots') this.persistedAppearance.pattern = 'stars';
    this.applyAppearance(this.persistedAppearance);
  }

  resetAppearance() {
    if (!this.canEditBoard || this.readOnlyView) return;
    if (!this.isIdentitySaving) { this.applyAppearance(this.defaultAppearance()); this.saveSettingsAutomatically(); }
  }

  private boardIdentitySourceId = '';
  private boardIdentityPersistedName = '';
  private boardIdentityPersistedUrl = '';
  private activeBoardUrl = '';
  private editingBoardUrl = '';

  get widgetEditorInset() { return widgetCornerInset(this.boardRadiusStepDraft); }

  get boardRadiusDraft() {
    return widgetCornerRadius(this.boardRadiusStepDraft);
  }

  pageState$ = createPageStateStream({
    reload$: this.reload$,
    routeParamMap$: this.routeContext$,
    resolveBoardId$: (routeParamBoardId, routeParamUsername) =>
      this.resolveBoardId$(routeParamBoardId, routeParamUsername),
    loadBoard: (boardId) => this.boardService.getBoard(boardId),
    recordBoardView: (boardId) => {
      this.insightsService.recordView(boardId, 'direct').subscribe({ error: () => { } });
    },
    onState: (state) => {
      if (state.status !== 'loading') this.isSettingsReloading = false;
      if (state.status === 'ready') {
        this.loadBoardPermissions(state.board.boardUrl);
      } else {
        this.revokeBoardAccess();
        this.activeBoardUrl = '';
      }

      if (state.status === 'ready' && (state.board.id !== this.boardIdentitySourceId || !this.hasUnsavedChanges)) {
        if (this.isWidgetEditMode) {
          this.cancelWidgetEdit();
        }
        if (state.board.id !== this.boardIdentitySourceId) this.settingsNotice = '';
        this.hydrateAppearance(state.board);
        this.boardIdentitySourceId = state.board.id;
        this.identityVersion = state.board.version;
        this.identitySaveError = '';
        this.boardIdentityNameDraft = state.board.boardName || this.boardMenuLabel(state.board.id);
        this.boardIdentityPersistedName = this.boardIdentityNameDraft;
        this.boardIdentitySlugDraft = state.board.boardUrl;
        this.boardIdentityPersistedUrl = state.board.boardUrl;
      }
    },
  });

  widgets$ = createWidgetsStream({
    reload$: this.reload$,
    routeParamMap$: this.routeContext$,
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
    this.destroyRef.onDestroy(() => { clearTimeout(this.noticeTimer); this.accessReset$.next(); });
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

  requestWidgetEdit(board: Board) {
    if (!this.canEditBoard || this.readOnlyView) return;
    if (this.isSettingsReloading || this.isWidgetLoading || this.isWidgetSaving || this.isIdentitySaving || this.isDeletingBoard) return;
    if (this.hasUnsavedChanges) {
      this.widgetSaveError = 'Save or cancel the board settings changes before editing widgets.';
      return;
    }
    this.isWidgetLoading = true;
    this.widgetSaveError = '';
    const slug = board.boardUrl;
    this.boardService.getEditor(slug)
      .pipe(takeUntil(this.accessReset$), takeUntilDestroyed(this.destroyRef), finalize(() => {
        this.isWidgetLoading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (snapshot) => {
          if (this.activeBoardUrl !== slug) return;
          this.startWidgetEdit(snapshot.board, snapshot.widgets);
        },
        error: (error) => {
          this.widgetSaveError = getApiErrorMessage(error, 'Unable to load the editor. Please try again.');
        },
      });
  }

  get settingsChanged(): boolean {
    return this.appearanceChanged || this.boardIdentityNameDraft !== this.boardIdentityPersistedName ||
      this.boardIdentitySlugDraft !== this.boardIdentityPersistedUrl;
  }

  get settingsFeedback(): string {
    if (this.isIdentitySaving) return 'Saving board settings…';
    if (this.isSettingsReloading) return 'Loading saved settings…';
    if (this.identitySaveError) return this.isBoardIdentityMenuOpen
      ? 'Settings were not saved. Your changes have been kept.'
      : 'Settings were not saved. Reopen settings to review the error.';
    if (this.settingsChanged) return 'Unsaved board settings';
    return this.settingsNotice;
  }

  get hasUnsavedChanges(): boolean {
    const identityChanged = this.settingsChanged;
    if (!this.isWidgetEditMode) return identityChanged;
    return identityChanged || this.boardDraftName.trim() !== this.originalBoardName.trim() ||
      this.boardDraftHeadline.trim() !== this.originalBoardHeadline.trim() ||
      this.boardDraftWebsite.trim() !== this.originalBoardWebsite ||
      this.profileNameDraft.trim() !== this.originalProfileName ||
      this.widgetDrafts.length !== this.originalWidgetDrafts.size ||
      this.widgetDrafts.some(draft => hasDraftChangedByOriginal(draft, this.originalWidgetDrafts));
  }

  canLeaveBoard(): boolean {
    if (this.isWidgetSaving || this.isIdentitySaving || this.isDeletingBoard) {
      this.widgetSaveError = 'Wait for the current operation to finish before leaving this board.';
      return false;
    }
    return !this.hasUnsavedChanges || window.confirm('Discard unsaved board changes?');
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges || this.isWidgetSaving || this.isIdentitySaving || this.isDeletingBoard) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  discardWidgetEdit() {
    if (this.isWidgetSaving) return;
    if (this.hasUnsavedChanges && !window.confirm('Discard unsaved board changes?')) return;
    this.cancelWidgetEdit();
    this.reload$.next();
  }

  startWidgetEdit(board: Board, widgets: Widget[]) {
    if (!this.canEditBoard || this.readOnlyView) return;
    this.activeNewWidgetDraft = null;
    this.profileNameDraft = this.originalProfileName = board.ownerDisplayName || board.ownerUsername || board.name;
    this.boardDraftWebsite = this.originalBoardWebsite = board.website || '';
    this.hydrateAppearance(board);
    this.editVersion = board.version ?? null;
    this.identityVersion = board.version;
    this.boardIdentityNameDraft = this.boardIdentityPersistedName = board.boardName;
    this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl = board.boardUrl;
    this.isBoardIdentityMenuOpen = false;
    Object.assign(
      this,
      buildStartWidgetEditState({
        board,
        widgets,
        activeBoardUrl: this.activeBoardUrl,
        toWidgetDraft: (widget) => toWidgetDraftHelper(widget),
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
    event.stopPropagation();
    event.preventDefault();
    if (!this.canEditBoard || this.readOnlyView) return;
    if (this.isSettingMainBoard || this.isMainBoard(boardId)) return;
    this.isSettingMainBoard = true;
    this.accountActionError = '';
    this.boardService.updateMyPreferences({ mainBoardId: boardId })
      .pipe(takeUntil(this.accessReset$), takeUntilDestroyed(this.destroyRef), finalize(() => {
        this.isSettingMainBoard = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (preferences) => {
          this.userStore.setMainBoardId(preferences.mainBoardId);
          this.boardStore.refreshBoards();
          this.closeAccountBoardActionsMenu();
        },
        error: (error) => {
          this.accountActionError = getApiErrorMessage(error, 'Unable to set main board.');
        },
      });
  }

  onAccountBoardDelete(boardUrl: string, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.canEditBoard || this.readOnlyView) return;

    if (this.isDeletingBoard || this.isWidgetSaving || this.isIdentitySaving || this.isWidgetLoading) return;
    this.pendingDeleteBoardUrl = boardUrl;
    this.pendingDeleteBoardLabel = this.accountBoards.find(board => board.boardUrl === boardUrl)?.label ?? this.boardIdentityPersistedName ?? boardUrl;
    this.isBoardSwitcherOpen = false;
    this.isBoardIdentityMenuOpen = true;
    this.boardDeleteError = '';
  }

  confirmBoardDelete() {
    if (!this.canEditBoard || this.readOnlyView) return;
    const boardUrl = this.pendingDeleteBoardUrl;
    if (!boardUrl || this.isDeletingBoard || this.isWidgetSaving || this.isIdentitySaving || this.isWidgetLoading) return;
    const label = this.pendingDeleteBoardLabel;
    this.boardStore.setNotice('');
    const fallbackRoute =
      this.accountBoards.find((board) => board.id === this.accountMainBoardId && board.boardUrl !== boardUrl)?.route ?? '/';

    runDeleteBoardAction({
      cancel$: this.accessReset$,
      boardUrl,
      activeBoardUrl: this.activeBoardUrl,
      fallbackRoute,
      isDeletingBoard: this.isDeletingBoard,
      setDeletingBoard: (isDeleting, deletingBoardUrl) => {
        this.isDeletingBoard = isDeleting;
        this.deletingBoardUrl = deletingBoardUrl;
        this.cdr.markForCheck();
      },
      setAccountActionError: (message) => {
        this.accountActionError = message;
        this.boardDeleteError = message;
        this.cdr.markForCheck();
      },
      onDeleted: () => this.boardStore.setNotice('Board "' + label + '" deleted.'),
      boardService: this.boardService,
      boardStore: this.boardStore,
      userStore: this.userStore,
      router: this.router,
      closeAccountBoardActionsMenu: () => this.closeAccountBoardActionsMenu(),
      closeBoardIdentityMenu: () => {
        if (boardUrl === this.activeBoardUrl) {
          this.cancelWidgetEdit();
          this.resetIdentityDraft();
          this.isBoardIdentityMenuOpen = false;
        }
      },
    });
  }

  createNewBoard() {
    if (!this.canLeaveBoard()) return;
    this.cancelWidgetEdit();
    this.resetIdentityDraft();
    runCreateNewBoardAction({
      cancel$: this.accessReset$,
      isCreatingBoard: this.isCreatingBoard,
      setAccountActionError: (message) => {
        this.accountActionError = message;
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

  readonly prepareSignOut = () => {
    if (!this.canLeaveBoard()) return false;
    this.cancelWidgetEdit();
    this.resetIdentityDraft();
    return true;
  };

  toggleBoardIdentityMenu() {
    if (!this.canEditBoard || this.readOnlyView) return;
    if (this.isSettingsReloading) return;
    if (this.isBoardIdentityMenuOpen) {
      this.closeBoardIdentityMenu(true);
      return;
    }
    this.settingsNotice = '';
    this.isBoardIdentityMenuOpen = true;
    this.cdr.detectChanges();
    this.elementRef.nativeElement.querySelector<HTMLInputElement>('input[name="board-identity-name"]')?.focus();
  }

  closeBoardIdentityMenu(restoreFocus = false) {
    this.pendingDeleteBoardUrl = null;
    this.isBoardSwitcherOpen = false;
    this.isBoardIdentityMenuOpen = false;
    if (restoreFocus) {
      this.elementRef.nativeElement.querySelector<HTMLButtonElement>('.board-identity-button')?.focus();
    }
  }

  resetIdentityDraft() {
    if (this.persistedAppearance.pattern === 'dots') this.persistedAppearance.pattern = 'stars';
    this.applyAppearance(this.persistedAppearance);
    this.boardIdentityNameDraft = this.boardIdentityPersistedName;
    this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl;
    this.identitySaveError = '';
  }

  cancelIdentityEdit() {
    if (this.isIdentitySaving) return;
    this.resetIdentityDraft();
    this.settingsNotice = 'Changes cancelled';
    this.closeBoardIdentityMenu(true);
    this.isSettingsReloading = true;
    this.reload$.next();
  }

  saveSettingsAutomatically() {
    if (!this.canEditBoard || this.readOnlyView || !this.settingsChanged) return;
    this.saveIdentity(true);
  }

  saveIdentity(automatic = false) {
    if (!this.canEditBoard || this.readOnlyView) return;
    if (this.isSettingsReloading || this.isIdentitySaving || this.isWidgetEditMode || this.isDeletingBoard) return;
    const prepared = prepareBoardIdentityUpdate({
      draftName: this.boardIdentityNameDraft,
      draftUrl: this.boardIdentitySlugDraft,
      persistedName: this.boardIdentityPersistedName,
      persistedUrl: this.boardIdentityPersistedUrl,
    });
    if (prepared.kind === 'reset') {
      this.identitySaveError = 'Enter a board name and a URL using letters, numbers, and single hyphens.';
      return;
    }
    if (prepared.kind === 'noop' && !this.appearanceChanged) {
      if (!automatic) this.cancelIdentityEdit();
      this.settingsNotice = 'No changes to save';
      return;
    }
    this.identitySaveError = '';
    this.settingsNotice = '';
    this.isIdentitySaving = true;
    this.boardService.updateBoardIdentity(this.boardIdentityPersistedUrl, {
      boardName: prepared.kind === 'update' ? prepared.boardName : this.boardIdentityPersistedName,
      boardUrl: prepared.kind === 'update' ? prepared.boardUrl : this.boardIdentityPersistedUrl,
      version: this.identityVersion, appearance: this.appearanceDraft,
    }).pipe(takeUntil(this.accessReset$), takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.isIdentitySaving = false;
      this.cdr.markForCheck();
    })).subscribe({
      next: (board) => {
        if (automatic) this.persistedAppearance = { ...this.defaultAppearance(), ...board.appearance };
        else this.hydrateAppearance(board);
        this.identityVersion = board.version;
        this.boardIdentityNameDraft = this.boardIdentityPersistedName = board.boardName;
        this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl = board.boardUrl;
        this.activeBoardUrl = board.boardUrl;
        this.isIdentitySaving = false;
        this.settingsNotice = 'Board settings saved';
        if (!automatic) this.closeBoardIdentityMenu(true);
        this.boardStore.updateBoardInStore(board);
        if (this.route.snapshot.paramMap.get('boardId') !== board.boardUrl
            || this.route.snapshot.paramMap.get('username') !== board.ownerUsername) {
          void this.router.navigateByUrl(boardRoute(board));
        } else if (!automatic) {
          this.reload$.next();
        }
      },
      error: (error) => {
        this.isBoardIdentityMenuOpen = true;
        this.identitySaveError = getApiErrorMessage(error, 'Unable to save board settings. Your changes have been kept.');
        this.cdr.detectChanges();
        this.elementRef.nativeElement.querySelector<HTMLElement>('#board-settings-error')?.focus();
      },
    });
  }

  dismissBoardSettings(reason: PanelDismissReason) {
    if (reason === 'back') {
      if (this.pendingDeleteBoardUrl) this.cancelBoardDelete();
      else this.isBoardSwitcherOpen = false;
    } else this.closeBoardIdentityMenu(reason === 'close');
  }

  cancelWidgetEdit() {
    this.activeNewWidgetDraft = null;
    this.editVersion = null;
    Object.assign(this, buildCancelWidgetEditState());
  }

  deleteWidget(draft: WidgetDraft) {
    if (!this.canEditBoard || this.readOnlyView || !this.isWidgetEditMode || this.isWidgetSaving) return;
    if (this.activeNewWidgetDraft === draft) this.activeNewWidgetDraft = null;
    const next = applyDeleteWidgetAction({
      draft,
      activeWidgetSettingsId: this.activeWidgetSettingsId,
      widgetDrafts: this.widgetDrafts,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
    });

    this.activeWidgetSettingsId = next.activeWidgetSettingsId;
    this.widgetDrafts = next.widgetDrafts;
  }

  private readonly injector = inject(Injector);
  addWidgetFromLibrary(selection: { type: 'link' | 'embed' | 'map'; origin: DOMRect }) {
    if (!this.canEditBoard || this.readOnlyView || !this.isWidgetEditMode || this.isWidgetSaving || this.isIdentitySaving) return;
    const added: WidgetDraft = {
      ...createEmptyWidgetDraftHelper(),
      type: selection.type,
      title: selection.type === 'link' ? 'Social' : selection.type[0].toUpperCase() + selection.type.slice(1),
      order: this.widgetDrafts.length,
    };
    this.widgetDrafts = [...this.widgetDrafts, added];
    this.widgetSaveError = '';
    afterNextRender(() => {
      if (!this.isWidgetEditMode || this.widgetDrafts.at(-1) !== added) return;
      const tiles = (this.elementRef.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.widget-edit-tile');
      const tile = tiles.item(tiles.length - 1);
      if (!tile) return;
      tile.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !tile.animate) return;
      const target = tile.getBoundingClientRect();
      const x = selection.origin.left - target.left;
      const y = selection.origin.top - target.top;
      const scale = target.width ? selection.origin.width / target.width : 1;
      tile.animate([
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: .5, transformOrigin: '0 0', zIndex: '21' },
        { transform: `translate(${x * .5}px, ${y * .5 - 50}px) scale(1.08)`, opacity: 1, offset: .55, transformOrigin: '0 0', zIndex: '21' },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, transformOrigin: '0 0', zIndex: '21' },
      ], { duration: 480, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }, { injector: this.injector });
  }

  moveWidget(draft: WidgetDraft, direction: -1 | 1) {
    if (!this.canEditBoard || this.readOnlyView || !this.isWidgetEditMode) return;
    this.widgetDrafts = applyMoveWidgetAction({
      draft,
      direction,
      isWidgetSaving: this.isWidgetSaving,
      widgetDrafts: this.widgetDrafts,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
    });
  }

  widgetEditorBounds = { left: 0, top: 0, width: 0, height: 0 };
  widgetEditorOrigin = { x: 0, y: 0 };
  private widgetEditorOpener?: HTMLElement;
  widgetEditorSize = 440;
  widgetBackdropHeight = 0;
  readonly widgetFlipDuration = 520;
  widgetEditorSourceSize = { width: 220, height: 220 };
  private widgetFlipAnimation?: Animation;
  private widgetFrontAnimation?: Animation;
  get widgetEditorPanelInset() {
    const inset = this.widgetEditorInset;
    const x = inset * this.widgetEditorSize / Math.max(1, this.widgetEditorSourceSize.width);
    const y = inset * this.widgetEditorSize / Math.max(1, this.widgetEditorSourceSize.height);
    return `${y}px ${x}px`;
  }
  get widgetEditorRadius() {
    const radius = this.boardRadiusDraft;
    return `${radius * this.widgetEditorSize / Math.max(1, this.widgetEditorSourceSize.width)}px / ${radius * this.widgetEditorSize / Math.max(1, this.widgetEditorSourceSize.height)}px`;
  }
  private animateWidgetFront(closing: boolean) {
    const front = this.elementRef.nativeElement.querySelector<HTMLElement>('.widget-editor-front');
    this.widgetFrontAnimation?.cancel();
    // Backdrop filters may sample the reverse face even with backface-visibility.
    // Remove it from painting at the edge-on point, without changing either material.
    this.widgetFrontAnimation = front?.animate([
      { visibility: closing ? 'hidden' : 'visible', offset: 0 },
      { visibility: closing ? 'hidden' : 'visible', offset: .499 },
      { visibility: closing ? 'visible' : 'hidden', offset: .5 },
      { visibility: closing ? 'visible' : 'hidden', offset: 1 },
    ], { duration: this.widgetFlipDuration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
  }
  widgetEditorClosing = false;
  private widgetEditorSnapshot?: WidgetDraft;
  private widgetEditorInitialIndex = 0;

  private widgetFlipFrames(closing = false): Keyframe[] {
    const { x, y } = this.widgetEditorOrigin;
    const slot = (angle: number) => ({ transform: `translate(${x}px, ${y}px) rotateY(${angle}deg) scale(${this.widgetEditorSourceSize.width / this.widgetEditorSize}, ${this.widgetEditorSourceSize.height / this.widgetEditorSize})` });
    const back = { transform: 'translate(0, 0) rotateY(180deg) scale(1)' };
    return closing ? [back, slot(360)] : [slot(0), back];
  }

  get selectedWidgetDraft(): WidgetDraft | undefined {
    return this.widgetDrafts.find(draft => this.isWidgetSettingsOpen(draft));
  }

  @HostListener('window:resize')
  positionWidgetEditor() {
    const host = this.elementRef.nativeElement;
    const board = host.querySelector<HTMLElement>('.board-content');
    if (!board) return;
    const bounds = board.getBoundingClientRect();
    const dockTop = host.querySelector('.bottom-actions')?.getBoundingClientRect().top ?? window.innerHeight;
    const top = Math.max(12, bounds.top);
    this.widgetBackdropHeight = window.innerHeight - top;
    this.widgetEditorBounds = { left: bounds.left, top, width: bounds.width, height: Math.max(0, dockTop - 12 - top) };
    const grid = board.querySelector<HTMLElement>('.board-grid');
    const style = grid ? getComputedStyle(grid) : null;
    const column = Number.parseFloat(style?.gridTemplateColumns ?? '') || 212;
    const gap = Number.parseFloat(style?.columnGap ?? '') || 16;
    // A 2×2 footprint, constrained only when the visible board cannot contain it.
    this.widgetEditorSize = Math.max(1, Math.min(column * 2 + gap, bounds.width - 24, this.widgetEditorBounds.height - 24));
  }

  @HostListener('document:pointerdown', ['$event'])
  dismissWidgetEditorOutside(event: PointerEvent) {
    if (this.selectedWidgetDraft && event.target instanceof Element && !event.target.closest('.widget-editor-flipper')) {
      this.closeWidgetSettings(true);
    }
  }

  closeWidgetSettings(cancel = false) {
    if (this.widgetEditorClosing) return;
    const draft = this.selectedWidgetDraft;
    if (cancel && draft && this.widgetEditorSnapshot) {
      Object.assign(draft, structuredClone(this.widgetEditorSnapshot));
      const remaining = this.widgetDrafts.filter(item => item !== draft);
      remaining.splice(this.widgetEditorInitialIndex, 0, draft);
      remaining.forEach((item, index) => item.order = index);
      this.widgetDrafts = remaining;
      this.draftValidationErrors.delete(draft);
    }
    const finish = () => {
      this.activeWidgetSettingsId = null;
      this.activeNewWidgetDraft = null;
      this.widgetEditorClosing = false;
      this.cdr.markForCheck();
      afterNextRender(() => this.widgetEditorOpener?.focus(), { injector: this.injector });
    };
    // Layout or order may have changed while the back was open.
    this.cdr.detectChanges();
    const destination = this.elementRef.nativeElement.querySelector<HTMLElement>('.widget-edit-source-hidden')?.getBoundingClientRect();
    if (destination && destination.width > 0 && destination.height > 0) {
      this.widgetEditorSourceSize = { width: destination.width, height: destination.height };
      this.widgetEditorOrigin = {
        x: destination.left + destination.width / 2 - this.widgetEditorBounds.left - this.widgetEditorBounds.width / 2,
        y: destination.top + destination.height / 2 - this.widgetEditorBounds.top - this.widgetEditorBounds.height / 2,
      };
    }
    const flipper = this.elementRef.nativeElement.querySelector<HTMLElement>('.widget-editor-flipper');
    if (!flipper?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    this.widgetEditorClosing = true;
    this.widgetFlipAnimation?.cancel();
    this.animateWidgetFront(true);
    this.widgetFlipAnimation = flipper.animate(this.widgetFlipFrames(true), { duration: this.widgetFlipDuration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    this.widgetFlipAnimation.finished.then(finish, finish);
  }

  trapWidgetEditorFocus(event: Event) {
    const keyboard = event as KeyboardEvent;
    const panel = event.currentTarget as HTMLElement;
    const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
    const first = controls[0], last = controls.at(-1);
    if (keyboard.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!keyboard.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  openWidgetSettings(draft: WidgetDraft, event?: Event) {
    if (!this.canEditBoard || this.readOnlyView || !this.isWidgetEditMode || this.isWidgetSaving) return;
    this.widgetEditorSnapshot = structuredClone(draft);
    this.widgetEditorInitialIndex = this.widgetDrafts.indexOf(draft);
    this.positionWidgetEditor();
    this.widgetEditorOpener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    const origin = this.widgetEditorOpener?.getBoundingClientRect();
    const bounds = this.widgetEditorBounds;
    this.widgetEditorOrigin = origin ? { x: origin.left + origin.width / 2 - bounds.left - bounds.width / 2,
      y: origin.top + origin.height / 2 - bounds.top - bounds.height / 2 } : { x: 0, y: 0 };
    this.widgetEditorSourceSize = origin ? { width: origin.width, height: origin.height } : { width: this.widgetEditorSize, height: this.widgetEditorSize };
    afterNextRender(() => {
      const flipper = this.elementRef.nativeElement.querySelector<HTMLElement>('.widget-editor-flipper');
      if (flipper?.animate && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        this.animateWidgetFront(false);
        this.widgetFlipAnimation = flipper.animate(this.widgetFlipFrames(), { duration: this.widgetFlipDuration, easing: 'cubic-bezier(.4,0,.2,1)' });
      }
      this.elementRef.nativeElement.querySelector<HTMLInputElement>('.widget-editor-back input')?.focus({ preventScroll: true });
    }, { injector: this.injector });
    this.activeNewWidgetDraft = draft.id ? null : draft;
    this.activeWidgetSettingsId = draft.id ?? null;
    this.draftValidationErrors.delete(draft);
  }

  isWidgetSettingsOpen(draft: WidgetDraft) {
    if (!draft.id) return this.activeNewWidgetDraft === draft;
    return this.activeWidgetSettingsId === draft.id;
  }

  widgetPreviewFromDraft(draft: WidgetDraft, index: number): Widget {
    return buildWidgetPreviewFromDraft({
      draft,
      index,
      buildWidgetPayload: (item) => buildWidgetPayloadHelper(item),
    });
  }

  doneWidgetEdit() {
    if (!this.canEditBoard || this.readOnlyView || !this.isWidgetEditMode || this.isWidgetSaving || this.isDeletingBoard) return;
    runDoneWidgetEdit({
      cancel$: this.accessReset$,
      version: this.editVersion,
      activeBoardUrl: this.activeBoardUrl,
      editingBoardUrl: this.editingBoardUrl,
      widgetDrafts: this.widgetDrafts,
      boardDraftName: this.boardDraftName,
      boardDraftHeadline: this.boardDraftHeadline,
      boardDraftWebsite: this.boardDraftWebsite,
      profileNameDraft: this.profileNameDraft,
      originalWidgetDrafts: this.originalWidgetDrafts,
      boardService: this.boardService,
      withNormalizedOrder: (drafts) => withNormalizedOrderHelper(drafts),
      buildWidgetPayload: (draft) => buildWidgetPayloadHelper(draft),
      getWidgetValidationMessage: (draft) => getWidgetValidationMessageHelper(draft),
      setWidgetDrafts: (drafts) => {
        this.widgetDrafts = drafts;
      },
      resetDraftValidationErrors: () => {
        this.draftValidationErrors = new WeakMap<WidgetDraft, string>();
      },
      setDraftValidationError: (draft, message) => {
        this.draftValidationErrors.set(draft, message);
      },
      setWidgetSaveError: (message) => {
        this.widgetSaveError = message;
        this.cdr.markForCheck();
      },
      setWidgetSaving: (saving) => {
        this.isWidgetSaving = saving;
        this.cdr.markForCheck();
      },
      onSaved: () => {
        if (this.profileNameDraft.trim() !== this.originalProfileName) this.userStore.refreshMyProfile();
        this.cancelWidgetEdit();
        this.reload$.next();
      },
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

  getDraftValidationError(draft: WidgetDraft) {
    return getDraftValidationErrorState({
      draft,
      draftValidationErrors: this.draftValidationErrors,
    });
  }

  private loadBoardPermissions(boardUrl: string) {
    this.permissionsRequest?.unsubscribe();
    this.canEditBoard = false;
    this.permissionsRequest = this.boardService.getBoardPermissions(boardUrl)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: permissions => {
        this.canEditBoard = !!permissions.canEdit;
        this.cdr.markForCheck();
      },
      error: () => {
        this.revokeBoardAccess();
        this.cdr.markForCheck();
      },
    });
  }

  private revokeBoardAccess() {
    this.permissionsRequest?.unsubscribe();
    this.canEditBoard = false;
    this.accessReset$.next();
    this.cancelWidgetEdit();
    this.resetIdentityDraft();
    this.closeBoardIdentityMenu();
    this.profileNameDraft = this.originalProfileName = '';
    this.boardDraftWebsite = this.originalBoardWebsite = '';
  }

  private resolveBoardId$(routeParamBoardId: string | null, routeParamUsername: string | null) {
    return resolveBoardIdHelper$({
      boardService: this.boardService,
      routeParamBoardId,
      routeParamUsername,
      dataBoardId: this.route.snapshot?.data?.["boardId"],
      userMainRoute: !!this.route.snapshot?.data?.["userMainRoute"],
    });
  }

}
