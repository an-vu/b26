import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  type MonoTypeOperatorFunction,
  Subject,
  type Subscription,
  takeUntil,
} from 'rxjs';

import type { Board, BoardAppearance } from '../../models/board';
import type { BoardIdentity } from '../../models/board-identity';
import { boardRoute } from '../../models/board-route';
import type { Widget } from '../../models/widget';
import { AuthService } from '../../services/auth.service';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';
import { InsightsService } from '../../services/insights.service';
import { UserStoreService } from '../../services/user-store.service';
import { BERRY_APPEARANCE } from '../../themes/appearance-values';
import { getApiErrorMessage } from '../../utils/api-error.util';
import { prepareBoardIdentityUpdate, resolveBoard$ } from './board-page.routing';
import {
  type BoardPageState,
  createPageStateStream,
  createWidgetsStream,
  type WidgetLoadState,
} from './board-page.streams';
import {
  buildWidgetPayload,
  createEmptyWidgetDraft,
  getWidgetValidationMessage,
  hasDraftChanged,
  normalizeHttpUrl,
  toWidgetDraft,
  toWidgetPreview,
  type WidgetDraft,
  type WidgetType,
  withNormalizedOrder,
  withWidgetType,
} from './board-page.widget-edit';
import { BoardSettingsState } from './board-settings-state';

export type AccountMenuBoard = {
  id: string;
  boardUrl: string;
  label: string;
  route: string;
  visibility?: 'public' | 'private';
};

/** A widget draft with a client-side key that stays stable while the draft is replaced. */
export type EditorDraft = WidgetDraft & { key: number };

type EditSession = {
  boardUrl: string;
  version: number | null;
  name: string;
  headline: string;
  profileName: string;
  website: string;
  widgets: ReadonlyMap<number, WidgetDraft>;
};

const FIX_FIELDS_MESSAGE = 'Fix highlighted widget fields before saving.';
const DISCARD_PROMPT = 'Discard unsaved board changes?';

export function mapAccountBoards(boards: BoardIdentity[]): AccountMenuBoard[] {
  return boards.map((board) => ({
    id: board.id,
    boardUrl: board.boardUrl,
    label: board.boardName,
    visibility: board.visibility,
    route: boardRoute(board),
  }));
}

/**
 * Board page state: the loaded board, permissions, settings drafts and the widget edit session.
 * Provided by BoardPageComponent, so it lives and dies with one mounted page.
 */
@Injectable()
export class BoardEditorStore {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly boardService = inject(BoardService);
  private readonly boardStore = inject(BoardStoreService);
  private readonly userStore = inject(UserStoreService);
  private readonly insights = inject(InsightsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload$ = new Subject<void>();
  /** Cancels in-flight requests when the board, account or permission changes. */
  private readonly accessReset$ = new Subject<void>();
  private permissionsRequest?: Subscription;
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private activeBoardUrl = '';
  private nextDraftKey = 0;

  readonly settings = new BoardSettingsState();
  readonly readOnly = toSignal(this.route.data.pipe(map((data) => !!data['readOnly'])), {
    initialValue: false,
  });
  readonly canEdit = signal(false);
  /** Owners and admins edit on both /:username and /:username/:slug; the server's canEdit decides. */
  readonly editable = this.canEdit.asReadonly();

  readonly accountBoards = computed(() => mapAccountBoards(this.boardStore.boards()));
  readonly mainBoardId = this.userStore.mainBoardId;
  readonly boardNotice = this.boardStore.notice;

  // Board settings panel.
  readonly settingsOpen = signal(false);
  readonly switcherOpen = signal(false);
  readonly settingsReloading = signal(false);
  readonly identitySaving = signal(false);
  readonly identityError = signal('');
  private readonly notice = signal('');
  readonly pendingDelete = signal<{ boardUrl: string; label: string } | null>(null);
  readonly deletingBoardUrl = signal('');
  readonly deletingBoard = computed(() => !!this.deletingBoardUrl());
  readonly boardDeleteError = signal('');
  readonly accountActionError = signal('');
  readonly settingMainBoard = signal(false);

  // Widget edit session.
  private readonly session = signal<EditSession | null>(null);
  readonly editing = computed(() => this.session() !== null);
  readonly editorLoading = signal(false);
  readonly widgetsSaving = signal(false);
  readonly widgetError = signal('');
  readonly boardName = signal('');
  readonly headline = signal('');
  readonly profileName = signal('');
  readonly website = signal('');
  readonly drafts = signal<EditorDraft[]>([]);
  private readonly draftErrors = signal<ReadonlyMap<number, string>>(new Map());
  readonly selectedKey = signal<number | null>(null);
  readonly selectedDraft = computed(() =>
    this.drafts().find((draft) => draft.key === this.selectedKey()),
  );
  readonly previews = computed(() => this.drafts().map(toWidgetPreview));

  readonly busy = computed(
    () => this.widgetsSaving() || this.identitySaving() || this.deletingBoard(),
  );

  readonly hasUnsavedChanges = computed(() => {
    if (this.settings.changed()) return true;
    const session = this.session();
    if (!session) return false;
    const drafts = this.drafts();
    return (
      this.boardName().trim() !== session.name.trim() ||
      this.headline().trim() !== session.headline.trim() ||
      this.website().trim() !== session.website ||
      this.profileName().trim() !== session.profileName ||
      drafts.length !== session.widgets.size ||
      drafts.some((draft) => hasDraftChanged(draft, session.widgets))
    );
  });

  readonly settingsFeedback = computed(() => {
    if (this.identitySaving()) return 'Saving board settings…';
    if (this.settingsReloading()) return 'Loading saved settings…';
    if (this.identityError()) {
      return this.settingsOpen()
        ? 'Settings were not saved. Your changes have been kept.'
        : 'Settings were not saved. Reopen settings to review the error.';
    }
    if (this.settings.changed()) return 'Unsaved board settings';
    return this.notice();
  });

  // Declared last: the streams emit synchronously and their side effects use the state above.
  private readonly pageState$ = createPageStateStream({
    reload$: this.reload$,
    routeParamMap$: combineLatest([
      this.route.paramMap,
      inject(AuthService).user$.pipe(
        map((user) => (user ? `${user.id}:${user.role}` : '')),
        distinctUntilChanged(),
      ),
    ]).pipe(map(([params]) => params)),
    resolveBoard$: (boardId, username) =>
      resolveBoard$({
        boardService: this.boardService,
        routeParamBoardId: boardId,
        routeParamUsername: username,
        dataBoardId: this.route.snapshot?.data?.['boardId'],
        userMainRoute: !!this.route.snapshot?.data?.['userMainRoute'],
      }),
    recordBoardView: (boardId) =>
      this.insights.recordView(boardId, 'direct').subscribe({ error: () => {} }),
    onState: (state) => this.onPageState(state),
  });
  readonly page = toSignal(this.pageState$, {
    initialValue: { status: 'loading' } as BoardPageState,
  });
  readonly widgets = toSignal(
    createWidgetsStream({
      pageState$: this.pageState$,
      loadWidgets: (boardUrl) => this.boardService.getWidgets(boardUrl),
      onAccessDenied: () => this.revokeAccess(),
    }),
    { initialValue: { status: 'loading', widgets: [] } as WidgetLoadState },
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.noticeTimer);
      this.accessReset$.next();
    });
  }

  reload() {
    this.reload$.next();
  }

  dismissBoardNotice() {
    this.boardStore.setNotice('');
  }

  isMainBoard(boardId: string) {
    return !!this.mainBoardId() && this.mainBoardId() === boardId;
  }

  boardMenuLabel(boardId: string) {
    return this.accountBoards().find((board) => board.id === boardId)?.label ?? boardId;
  }

  /** Confirms with the user when leaving would discard drafts; refuses while saving. */
  canLeave(): boolean {
    if (this.busy()) {
      this.widgetError.set('Wait for the current operation to finish before leaving this board.');
      return false;
    }
    return !this.hasUnsavedChanges() || window.confirm(DISCARD_PROMPT);
  }

  blocksUnload() {
    return this.hasUnsavedChanges() || this.busy();
  }

  // Board settings ---------------------------------------------------------------------------

  openSettings() {
    this.setNotice('');
    this.settingsOpen.set(true);
  }

  closeSettings() {
    this.pendingDelete.set(null);
    this.switcherOpen.set(false);
    this.settingsOpen.set(false);
  }

  toggleSwitcher() {
    this.pendingDelete.set(null);
    this.switcherOpen.update((open) => !open);
  }

  resetIdentityDraft() {
    this.settings.reset();
    this.identityError.set('');
  }

  /** Discard settings drafts and reload the latest saved revision. */
  cancelSettings() {
    if (this.identitySaving()) return;
    this.resetIdentityDraft();
    this.setNotice('Changes cancelled');
    this.closeSettings();
    this.settingsReloading.set(true);
    this.reload();
  }

  changeAppearance(appearance: BoardAppearance, onError?: () => void) {
    if (!this.canEdit()) return;
    this.settings.applyAppearance(appearance);
    this.saveSettings(onError);
  }

  resetAppearance(onError?: () => void) {
    if (!this.canEdit() || this.identitySaving()) return;
    this.changeAppearance({ ...BERRY_APPEARANCE }, onError);
  }

  /** Settings save automatically; a failure keeps the drafts and reopens the panel. */
  saveSettings(onError?: () => void) {
    if (!this.canEdit() || !this.settings.changed()) return;
    if (this.settingsReloading() || this.identitySaving() || this.editing() || this.deletingBoard()) {
      return;
    }
    const settings = this.settings;
    const prepared = prepareBoardIdentityUpdate({
      draftName: settings.name(),
      draftUrl: settings.slug(),
      persistedName: settings.savedName(),
      persistedUrl: settings.savedSlug(),
    });
    if (prepared.kind === 'reset') {
      this.identityError.set(
        'Enter a board name and a URL using letters, numbers, and single hyphens.',
      );
      return;
    }
    if (prepared.kind === 'noop' && !settings.appearanceChanged()) {
      this.setNotice('No changes to save');
      return;
    }
    this.identityError.set('');
    this.setNotice('');
    this.identitySaving.set(true);
    this.boardService
      .updateBoardIdentity(settings.savedSlug(), {
        boardName: prepared.kind === 'update' ? prepared.boardName : settings.savedName(),
        boardUrl: prepared.kind === 'update' ? prepared.boardUrl : settings.savedSlug(),
        version: settings.version(),
        appearance: settings.appearance(),
      })
      .pipe(
        this.untilAccessReset(),
        finalize(() => this.identitySaving.set(false)),
      )
      .subscribe({
        next: (board) => {
          settings.hydrate(board, true);
          this.activeBoardUrl = board.boardUrl;
          this.identitySaving.set(false);
          this.setNotice('Board settings saved');
          this.boardStore.updateBoardInStore(board);
          const params = this.route.snapshot.paramMap;
          // The main-board view (/:username) has no slug in its URL, so a rename keeps it in place.
          const slugChanged = !this.readOnly() && params.get('boardId') !== board.boardUrl;
          if (slugChanged || params.get('username') !== board.ownerUsername) {
            void this.router.navigateByUrl(boardRoute(board));
          }
        },
        error: (error) => {
          this.settingsOpen.set(true);
          this.identityError.set(
            getApiErrorMessage(error, 'Unable to save board settings. Your changes have been kept.'),
          );
          onError?.();
        },
      });
  }

  // Account boards ---------------------------------------------------------------------------

  setMainBoard(boardId: string) {
    if (!this.canEdit() || this.settingMainBoard() || this.isMainBoard(boardId)) return;
    this.settingMainBoard.set(true);
    this.accountActionError.set('');
    this.boardService
      .updateMyPreferences({ mainBoardId: boardId })
      .pipe(
        this.untilAccessReset(),
        finalize(() => this.settingMainBoard.set(false)),
      )
      .subscribe({
        next: (preferences) => this.userStore.setMainBoardId(preferences.mainBoardId),
        error: (error) =>
          this.accountActionError.set(getApiErrorMessage(error, 'Unable to set main board.')),
      });
  }

  requestBoardDelete(boardUrl: string) {
    if (!this.canEdit()) return;
    if (this.deletingBoard() || this.widgetsSaving() || this.identitySaving()) return;
    if (this.editorLoading()) return;
    const label =
      this.accountBoards().find((board) => board.boardUrl === boardUrl)?.label ??
      this.settings.savedName();
    this.pendingDelete.set({ boardUrl, label });
    this.switcherOpen.set(false);
    this.settingsOpen.set(true);
    this.boardDeleteError.set('');
  }

  cancelBoardDelete() {
    if (!this.deletingBoard()) this.pendingDelete.set(null);
  }

  confirmBoardDelete() {
    const pending = this.pendingDelete();
    if (!this.canEdit() || !pending) return;
    if (this.deletingBoard() || this.widgetsSaving() || this.identitySaving()) return;
    if (this.editorLoading()) return;
    const { boardUrl, label } = pending;
    const deletingActiveBoard = boardUrl === this.activeBoardUrl;
    const fallbackRoute =
      this.accountBoards().find(
        (board) => board.id === this.mainBoardId() && board.boardUrl !== boardUrl,
      )?.route ?? '/';
    this.boardStore.setNotice('');
    this.setAccountError('');
    this.deletingBoardUrl.set(boardUrl);
    this.boardService
      .deleteBoard(boardUrl)
      .pipe(
        this.untilAccessReset(),
        finalize(() => this.deletingBoardUrl.set('')),
      )
      .subscribe({
        next: () => {
          this.deletingBoardUrl.set('');
          this.boardStore.setNotice(`Board "${label}" deleted.`);
          if (deletingActiveBoard) {
            this.cancelEdit();
            this.resetIdentityDraft();
            this.settingsOpen.set(false);
          }
          this.boardStore.refreshBoards();
          this.userStore.refreshMyPreferences();
          if (deletingActiveBoard) void this.router.navigateByUrl(fallbackRoute);
        },
        error: (error) => this.setAccountError(getApiErrorMessage(error, 'Unable to delete board.')),
      });
  }

  // Widget edit session ----------------------------------------------------------------------

  /** Load a coherent editor snapshot rather than editing the possibly stale displayed board. */
  requestEdit(board: Board) {
    if (!this.editable() || this.settingsReloading() || this.editorLoading()) return;
    if (this.busy()) return;
    if (this.hasUnsavedChanges()) {
      this.widgetError.set('Save or cancel the board settings changes before editing widgets.');
      return;
    }
    this.editorLoading.set(true);
    this.widgetError.set('');
    const boardUrl = board.boardUrl;
    this.boardService
      .getEditor(boardUrl)
      .pipe(
        this.untilAccessReset(),
        finalize(() => this.editorLoading.set(false)),
      )
      .subscribe({
        next: (snapshot) => {
          if (this.activeBoardUrl === boardUrl) this.startEdit(snapshot.board, snapshot.widgets);
        },
        error: (error) =>
          this.widgetError.set(
            getApiErrorMessage(error, 'Unable to load the editor. Please try again.'),
          ),
      });
  }

  startEdit(board: Board, widgets: Widget[]) {
    if (!this.editable()) return;
    const drafts = widgets
      .map((widget) => this.withKey(toWidgetDraft(widget)))
      .sort((a, b) => a.order - b.order);
    const profileName = board.ownerDisplayName || board.ownerUsername || board.name;
    const website = board.website || '';
    this.settings.hydrate(board);
    this.settingsOpen.set(false);
    this.session.set({
      boardUrl: this.activeBoardUrl || board.boardUrl,
      version: board.version ?? null,
      name: board.name,
      headline: board.headline,
      profileName,
      website,
      widgets: new Map(
        drafts.flatMap((draft) => (typeof draft.id === 'number' ? [[draft.id, draft]] : [])),
      ),
    });
    this.boardName.set(board.name);
    this.headline.set(board.headline);
    this.profileName.set(profileName);
    this.website.set(website);
    this.drafts.set(drafts);
    this.draftErrors.set(new Map());
    this.selectedKey.set(null);
    this.widgetError.set('');
  }

  cancelEdit() {
    this.session.set(null);
    this.widgetsSaving.set(false);
    this.widgetError.set('');
    this.boardName.set('');
    this.headline.set('');
    this.profileName.set('');
    this.website.set('');
    this.drafts.set([]);
    this.draftErrors.set(new Map());
    this.selectedKey.set(null);
  }

  /** The editor's Cancel button: confirm, drop the session and show the saved board again. */
  discardEdit() {
    if (this.widgetsSaving()) return;
    if (this.hasUnsavedChanges() && !window.confirm(DISCARD_PROMPT)) return;
    this.cancelEdit();
    this.reload();
  }

  saveEdit() {
    const session = this.session();
    if (!this.editable() || !session || this.widgetsSaving() || this.deletingBoard()) return;
    const boardUrl = this.activeBoardUrl.trim();
    if (!boardUrl) return this.widgetError.set('Board context changed. Reload and try again.');
    if (session.boardUrl && session.boardUrl !== boardUrl) {
      return this.widgetError.set('Board changed while editing. Re-open edit and try again.');
    }

    const drafts = withNormalizedOrder(this.drafts());
    this.drafts.set(drafts);
    this.draftErrors.set(new Map());
    for (const draft of drafts) {
      const message = hasDraftChanged(draft, session.widgets) && getWidgetValidationMessage(draft);
      if (message) {
        this.draftErrors.set(new Map([[draft.key, message]]));
        return this.widgetError.set(FIX_FIELDS_MESSAGE);
      }
    }

    const name = this.boardName().trim();
    const headline = this.headline().trim();
    const profileName = this.profileName().trim();
    const rawWebsite = this.website().trim();
    const website = rawWebsite ? normalizeHttpUrl(rawWebsite) : '';
    const error =
      !name || !headline
        ? 'Title and description are required.'
        : name.length > 255 || headline.length > 255
          ? 'Title and description must be at most 255 characters.'
          : session.version === null
            ? 'Unable to determine board version. Cancel and reopen the editor.'
            : !profileName || profileName.length > 255
              ? 'Enter a name of 1–255 characters.'
              : website === null || website.length > 2048
                ? 'Enter a valid website address, such as example.com.'
                : '';
    if (error || session.version === null || website === null) return this.widgetError.set(error);

    this.widgetsSaving.set(true);
    this.widgetError.set('');
    this.boardService
      .saveEditor(boardUrl, {
        version: session.version,
        name,
        headline,
        ownerDisplayName: profileName,
        website,
        widgets: drafts.map((draft) => ({
          id: typeof draft.id === 'number' ? draft.id : undefined,
          ...buildWidgetPayload(draft),
        })),
      })
      .pipe(
        this.untilAccessReset(),
        finalize(() => this.widgetsSaving.set(false)),
      )
      .subscribe({
        next: () => {
          if (profileName !== session.profileName) this.userStore.refreshMyProfile();
          this.cancelEdit();
          this.reload();
        },
        error: (error) =>
          this.widgetError.set(getApiErrorMessage(error, 'Unable to save widget changes.')),
      });
  }

  addDraft(type: 'link' | 'embed' | 'map'): EditorDraft | undefined {
    if (!this.editable() || !this.editing() || this.widgetsSaving() || this.identitySaving()) return;
    const draft = this.withKey({
      ...createEmptyWidgetDraft(),
      type,
      title: type === 'link' ? 'Social' : type[0].toUpperCase() + type.slice(1),
      order: this.drafts().length,
    });
    this.drafts.update((drafts) => [...drafts, draft]);
    this.widgetError.set('');
    return draft;
  }

  deleteDraft(draft: EditorDraft) {
    if (!this.editable() || !this.editing() || this.widgetsSaving()) return;
    if (this.selectedKey() === draft.key) this.selectedKey.set(null);
    this.drafts.update((drafts) => withNormalizedOrder(drafts.filter((d) => d.key !== draft.key)));
  }

  moveDraft(draft: EditorDraft, direction: -1 | 1) {
    if (!this.editable() || !this.editing() || this.widgetsSaving()) return;
    const drafts = [...this.drafts()];
    const index = drafts.findIndex((d) => d.key === draft.key);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= drafts.length) return;
    [drafts[index], drafts[target]] = [drafts[target], drafts[index]];
    this.drafts.set(withNormalizedOrder(drafts));
  }

  updateDraft(draft: EditorDraft, patch: Partial<WidgetDraft>) {
    this.replaceDraft(draft.key, (current) => ({ ...current, ...patch }));
    if (this.widgetError() === FIX_FIELDS_MESSAGE) this.widgetError.set('');
  }

  changeDraftType(draft: EditorDraft, type: WidgetType) {
    const original = typeof draft.id === 'number' ? this.session()?.widgets.get(draft.id) : undefined;
    this.replaceDraft(draft.key, (current) => withWidgetType(current, type, original));
  }

  /** Open a draft's settings. Returns false when editing is not currently allowed. */
  selectDraft(draft: EditorDraft): boolean {
    if (!this.editable() || !this.editing() || this.widgetsSaving()) return false;
    this.selectedKey.set(draft.key);
    this.clearDraftError(draft.key);
    return true;
  }

  /** Put back a draft as it was when its settings opened, at its original position. */
  restoreDraft(snapshot: EditorDraft, index: number) {
    const drafts = this.drafts().filter((draft) => draft.key !== snapshot.key);
    drafts.splice(index, 0, snapshot);
    this.drafts.set(withNormalizedOrder(drafts));
    this.clearDraftError(snapshot.key);
  }

  draftError(draft: EditorDraft) {
    return this.draftErrors().get(draft.key) ?? '';
  }

  // Internals --------------------------------------------------------------------------------

  private onPageState(state: BoardPageState) {
    if (state.status !== 'loading') this.settingsReloading.set(false);
    if (state.status !== 'ready') {
      this.revokeAccess();
      this.activeBoardUrl = '';
      return;
    }
    this.activeBoardUrl = state.board.boardUrl;
    this.loadPermissions(state.board.boardUrl);
    const boardChanged = state.board.id !== this.settings.boardId();
    if (boardChanged || !this.hasUnsavedChanges()) {
      if (this.editing()) this.cancelEdit();
      if (boardChanged) this.setNotice('');
      this.settings.hydrate(state.board);
      this.identityError.set('');
    }
  }

  private loadPermissions(boardUrl: string) {
    this.permissionsRequest?.unsubscribe();
    this.canEdit.set(false);
    this.permissionsRequest = this.boardService
      .getBoardPermissions(boardUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (permissions) => this.canEdit.set(!!permissions.canEdit),
        error: () => this.revokeAccess(),
      });
  }

  private revokeAccess() {
    this.permissionsRequest?.unsubscribe();
    this.canEdit.set(false);
    this.accessReset$.next();
    this.cancelEdit();
    this.resetIdentityDraft();
    this.closeSettings();
  }

  private setNotice(value: string) {
    clearTimeout(this.noticeTimer);
    this.notice.set(value);
    if (value) this.noticeTimer = setTimeout(() => this.notice.set(''), 3000);
  }

  private setAccountError(message: string) {
    this.accountActionError.set(message);
    this.boardDeleteError.set(message);
  }

  private withKey(draft: WidgetDraft): EditorDraft {
    return { ...draft, key: this.nextDraftKey++ };
  }

  private replaceDraft(key: number, change: (draft: EditorDraft) => EditorDraft) {
    this.drafts.update((drafts) => drafts.map((draft) => (draft.key === key ? change(draft) : draft)));
    this.clearDraftError(key);
  }

  private clearDraftError(key: number) {
    if (!this.draftErrors().has(key)) return;
    const errors = new Map(this.draftErrors());
    errors.delete(key);
    this.draftErrors.set(errors);
  }

  private untilAccessReset<T>(): MonoTypeOperatorFunction<T> {
    return (source) =>
      source.pipe(takeUntil(this.accessReset$), takeUntilDestroyed(this.destroyRef));
  }
}
