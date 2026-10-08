import { AtmosphereParticles } from '../../themes/atmosphere-particles';
import { AppearanceSettingsComponent } from '../../components/appearance-settings/appearance-settings';
import { SiteNavigationComponent } from '../../components/site-navigation/site-navigation';
import { SiteThemeService } from '../../services/site-theme.service';
import { WidgetBounceDirective } from '../../directives/widget-bounce';
import { BoardAtmosphereComponent } from '../../components/board-atmosphere/board-atmosphere';
import { BOARD_PALETTE } from '../../themes/board-palette';
import { BOARD_THEMES, BoardThemeId } from '../../themes/board-theme';
import { BoardAppearance } from '../../models/board';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { hasDraftChangedByOriginal } from './board-page.save-flow';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { FormsModule } from '@angular/forms';
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
import { boardRoute } from '../../models/board-route';
import { resolveBoardId$ as resolveBoardIdHelper$ } from './board-page.routing';
import { prepareBoardIdentityUpdate } from './board-page.routing';
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
  runDeleteBoardAction,
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
  imports: [AppearanceSettingsComponent, SiteNavigationComponent, WidgetBounceDirective, BoardAtmosphereComponent, CommonModule, FormsModule, WidgetHostComponent],
  templateUrl: './board-page.html',
  styleUrls: [
    './board-page.layout.css', './board-page.grid.css', './board-page.widget-edit.css',
    './board-page.identity.css', './board-page.account-menu.css',
  ],
})
export class BoardPageComponent {
  onAppearanceChange(appearance: BoardAppearance) {
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
  private authService = inject(AuthService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private reload$ = new Subject<void>();
  private boardPermissionsRequestId = 0;

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
  switchToBoard(route: string) {
    if (!this.canLeaveBoard()) return;
    this.closeBoardIdentityMenu();
    void this.router.navigateByUrl(route);
  }

  canEditBoard = false;
  readOnlyView = false;
  widgetSaveError = '';
  newWidgetValidationError = '';
  isAddWidgetExpanded = false;
  boardDraftName = '';
  boardDraftHeadline = '';
  profileNameDraft = '';
  private originalProfileName = '';
  boardDraftWebsite = '';
  private originalBoardWebsite = '';
  safeWebsite(value?: string): string | null {
    try { const url = new URL(value || ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
  }
  originalBoardName = '';
  originalBoardHeadline = '';
  boardIdentityNameDraft = '';
  boardIdentitySlugDraft = '';
  boardThemeFamilyDraft: BoardThemeId = 'default';
  get boardTheme() {
    return BOARD_THEMES.find(theme => theme.id === this.boardThemeFamilyDraft) ?? BOARD_THEMES[0];
  }
  private requestedTheme?: BoardThemeId;
  private themeTransition?: { skipTransition(): void };
  selectBoardTheme(id: BoardThemeId) {
    if (this.isIdentitySaving || id === (this.requestedTheme ?? this.boardThemeFamilyDraft) || BOARD_THEMES.find(theme => theme.id === id)?.status !== 'available') return;
    this.requestedTheme = id;
    this.themeTransition?.skipTransition();
    const update = () => { if (this.destroyRef.destroyed || this.requestedTheme !== id) return; this.boardThemeFamilyDraft = id; this.requestedTheme = undefined; this.cdr.detectChanges(); this.saveSettingsAutomatically(); };
    if (typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const transition = document.startViewTransition(update);
      transition.ready.catch(() => { /* A newer selection may skip this snapshot. */ });
      this.themeTransition = transition;
    } else { update(); }
  }
  readonly pickerHover: Record<string, string | null> = {};
  readonly pickerFocus: Record<string, string | null> = {};
  pickerLabel(section: string, selected: string): string {
    return this.pickerHover[section] || this.pickerFocus[section] || selected;
  }
  readonly boardThemes = BOARD_THEMES;
  boardThemeToggleDraft = false;
  boardRadiusStepDraft: 1 | 2 | 3 = 2;
  boardSpacingStepDraft: 1 | 2 | 3 = 2;
  get spacingLabel(): string { return this.boardSpacingStepDraft === 1 ? 'Small' : this.boardSpacingStepDraft === 3 ? 'Large' : 'Medium'; }
  boardBackgroundColorDraft = '#f9f8f6';
  boardPatternDraft: BoardAppearance['pattern'] = 'none';
  boardPatternIntensityDraft: NonNullable<BoardAppearance['patternIntensity']> = 'light';
  widgetDrafts: WidgetDraft[] = [];
  activeWidgetSettingsId: number | null = null;
  newWidgetDraft: WidgetDraft = createEmptyWidgetDraftHelper();
  deletedWidgetIds: number[] = [];
  private originalWidgetDrafts = new Map<number, WidgetDraft>();
  private draftValidationErrors = new WeakMap<WidgetDraft, string>();
  readonly boardColors = BOARD_PALETTE;
  private readonly atmosphere = new AtmosphereParticles();
  readonly boardPatterns: BoardAppearance['pattern'][] = ['none', 'stars', 'snow', 'grid', 'rainfall', 'sakura', 'wave'];
  get screenDroplets() { return this.atmosphere.screenDroplets(this.boardPatternIntensityDraft); }
  get atmosphereParticles() { return this.atmosphere.particles(this.boardPatternDraft, this.boardPatternIntensityDraft); }
  selectBoardPattern(pattern: BoardAppearance['pattern']) {
    if (this.isIdentitySaving) return;
    if (pattern === this.boardPatternDraft && pattern !== 'none') {
      this.boardPatternIntensityDraft = this.boardPatternIntensityDraft === 'light' ? 'medium' : this.boardPatternIntensityDraft === 'medium' ? 'heavy' : 'light';
    } else {
      this.boardPatternDraft = pattern;
      this.boardPatternIntensityDraft = 'light';
    }
    this.cdr.markForCheck();
    this.saveSettingsAutomatically();
  }
  private persistedAppearance: BoardAppearance = this.defaultAppearance();

  defaultAppearance(): BoardAppearance {
    return { spacingStep: 2, patternIntensity: 'light', themeFamily: 'default', theme: 'light', radiusStep: 2, backgroundColor: '#f9f8f6', pattern: 'none' };
  }

  // Render legacy white boards using the new paper color without rewriting saved data.
  get boardDisplayBackground(): string {
    return this.boardBackgroundColorDraft.toLowerCase() === '#ffffff'
      ? '#f9f8f6' : this.boardBackgroundColorDraft;
  }

  get boardDarkBackground(): string {
    return this.boardDisplayBackground === '#f9f8f6' ? '#30302e' : `color-mix(in srgb, ${this.boardDisplayBackground} 38%, #181a19)`;
  }

  get boardDisplayText(): string {
    const hex = this.boardDisplayBackground.slice(1);
    const channels = [0, 2, 4].map(offset => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return luminance < 0.3 ? '#f9f8f6' : '#30302e';
  }

  get appearanceDraft(): BoardAppearance {
    return { themeFamily: this.boardThemeFamilyDraft, theme: this.boardThemeToggleDraft ? 'dark' : 'light',
      spacingStep: Number(this.boardSpacingStepDraft) as 1 | 2 | 3,
      radiusStep: Number(this.boardRadiusStepDraft) as 1 | 2 | 3,
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
    this.requestedTheme = undefined;
    this.themeTransition?.skipTransition();
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
    if (!this.isIdentitySaving) { this.applyAppearance(this.defaultAppearance()); this.saveSettingsAutomatically(); }
  }

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
      if (state.status !== 'loading') this.isSettingsReloading = false;
      if (state.status === 'ready') {
        this.loadBoardPermissions(state.board.boardUrl);
      } else {
        this.canEditBoard = false;
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
    this.destroyRef.onDestroy(() => clearTimeout(this.noticeTimer));
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
    if (this.isSettingsReloading || this.isWidgetLoading || this.isWidgetSaving || this.isIdentitySaving || this.isDeletingBoard) return;
    if (this.hasUnsavedChanges) {
      this.widgetSaveError = 'Save or cancel the board settings changes before editing widgets.';
      return;
    }
    this.isWidgetLoading = true;
    this.widgetSaveError = '';
    const slug = board.boardUrl;
    this.boardService.getEditor(slug)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
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

  get backgroundColorLabel(): string {
    return this.boardColors.find(color => color.value === this.boardDisplayBackground)?.name ?? this.boardDisplayBackground.toUpperCase();
  }

  get radiusLabel(): string {
    return this.boardRadiusStepDraft === 1 ? 'Small' : this.boardRadiusStepDraft === 3 ? 'Large' : 'Medium';
  }

  patternLabel(pattern: string): string {
    if (pattern === 'grid') return 'Meteor';
    return pattern.charAt(0).toUpperCase() + pattern.slice(1).replace(/-/g, ' ');
  }

  get hasUnsavedChanges(): boolean {
    const identityChanged = this.settingsChanged;
    if (!this.isWidgetEditMode) return identityChanged;
    return identityChanged || this.boardDraftName.trim() !== this.originalBoardName.trim() ||
      this.boardDraftHeadline.trim() !== this.originalBoardHeadline.trim() ||
      this.boardDraftWebsite.trim() !== this.originalBoardWebsite ||
      this.profileNameDraft.trim() !== this.originalProfileName ||
      this.widgetDrafts.length !== this.originalWidgetDrafts.size ||
      this.widgetDrafts.some(draft => hasDraftChangedByOriginal(draft, this.originalWidgetDrafts)) ||
      this.hasPendingNewWidget;
  }

  get hasPendingNewWidget(): boolean {
    return this.isAddWidgetExpanded && !!(this.newWidgetDraft.title.trim() ||
      this.newWidgetDraft.embedUrl.trim() || this.newWidgetDraft.linkUrl.trim() ||
      this.newWidgetDraft.placesText.trim());
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
    event.stopPropagation();
    event.preventDefault();
    if (this.isSettingMainBoard || this.isMainBoard(boardId)) return;
    this.isSettingMainBoard = true;
    this.accountActionError = '';
    this.boardService.updateMyPreferences({ mainBoardId: boardId })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
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

    if (this.isDeletingBoard || this.isWidgetSaving || this.isIdentitySaving || this.isWidgetLoading) return;
    const label = this.accountBoards.find((board) => board.boardUrl === boardUrl)?.label ?? boardUrl;
    const draftWarning = boardUrl === this.activeBoardUrl && this.hasUnsavedChanges
      ? ' Unsaved changes will also be lost.' : '';
    if (!window.confirm('Permanently delete "' + label + '" and all its contents?' + draftWarning)) return;
    this.boardStore.setNotice('');
    const fallbackRoute =
      this.accountBoards.find((board) => board.id === this.accountMainBoardId && board.boardUrl !== boardUrl)?.route ?? '/';

    runDeleteBoardAction({
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
    if (this.isSettingsReloading) return;
    if (this.isBoardIdentityMenuOpen) {
      this.closeBoardIdentityMenu(true);
      return;
    }
    this.settingsNotice = '';
    for (const section of ['theme', 'color', 'pattern']) { this.pickerHover[section] = null; this.pickerFocus[section] = null; }
    this.isBoardIdentityMenuOpen = true;
    this.cdr.detectChanges();
    this.elementRef.nativeElement.querySelector<HTMLInputElement>('input[name="board-identity-name"]')?.focus();
  }

  closeBoardIdentityMenu(restoreFocus = false) {
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
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
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
    if (this.isBoardSwitcherOpen) { this.isBoardSwitcherOpen = false; return; }
    const actions = getEscapeMenuCloseActions({
      isAccountMenuOpen: this.isAccountMenuOpen,
      isBoardIdentityMenuOpen: this.isBoardIdentityMenuOpen,
    });

    if (actions.closeAccountMenu) {
      this.closeAccountMenu();
    }
    if (actions.closeBoardIdentityMenu) {
      this.closeBoardIdentityMenu(true);
    }
  }

  cancelWidgetEdit() {
    this.editVersion = null;
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
    if (this.isWidgetSaving || this.isDeletingBoard) return;
    if (this.hasPendingNewWidget) {
      this.widgetSaveError = 'Add the new widget or clear its fields before saving.';
      return;
    }
    runDoneWidgetEditAdapter({
      version: this.editVersion,
      activeBoardUrl: this.activeBoardUrl,
      editingBoardUrl: this.editingBoardUrl,
      widgetDrafts: this.widgetDrafts,
      boardDraftName: this.boardDraftName,
      boardDraftHeadline: this.boardDraftHeadline,
      boardDraftWebsite: this.boardDraftWebsite,
      profileNameDraft: this.profileNameDraft,
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
