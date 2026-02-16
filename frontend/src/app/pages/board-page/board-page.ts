import { Component, DestroyRef, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { catchError, finalize, forkJoin, map, of, startWith, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { InsightsService } from '../../services/insights.service';
import { UserStoreService } from '../../services/user-store.service';
import { BoardHeaderComponent } from '../../components/board-header/board-header';
import type { Board } from '../../models/board';
import type { UpsertWidgetRequest, Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type BoardPageState =
  | { status: 'loading' }
  | { status: 'ready'; board: Board }
  | { status: 'missing' };

type WidgetType = 'embed' | 'map' | 'link' | 'user-settings' | 'admin-settings';
type WidgetDraft = {
  id?: number;
  type: WidgetType;
  title: string;
  layout: string;
  enabled: boolean;
  order: number;
  embedUrl: string;
  linkUrl: string;
  placesText: string;
};

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
  private elementRef = inject(ElementRef<HTMLElement>);
  private destroyRef = inject(DestroyRef);
  private reload$ = new Subject<void>();
  private hasLoadedPageStateOnce = false;

  isWidgetEditMode = false;
  isWidgetSaving = false;
  isAccountMenuOpen = false;
  isBoardIdentityMenuOpen = false;
  widgetSaveError = '';
  newWidgetValidationError = '';
  isAddWidgetExpanded = false;
  boardDraftName = '';
  boardDraftHeadline = '';
  boardIdentityNameDraft = '';
  boardIdentitySlugDraft = '';
  boardThemeToggleDraft = false;
  boardRadiusStepDraft: 1 | 2 | 3 = 2;
  boardBackgroundColorDraft = '#ffffff';
  boardPatternDraft: 'none' | 'dots' | 'grid' = 'none';
  widgetDrafts: WidgetDraft[] = [];
  activeWidgetSettingsId: number | null = null;
  newWidgetDraft: WidgetDraft = this.createEmptyWidgetDraft();
  deletedWidgetIds: number[] = [];
  private draftValidationErrors = new WeakMap<WidgetDraft, string>();
  private boardIdentitySourceId = '';
  private boardIdentityPersistedName = '';
  private boardIdentityPersistedUrl = '';

  get boardRadiusDraft() {
    return this.boardRadiusStepDraft === 1 ? 6 : this.boardRadiusStepDraft === 3 ? 24 : 12;
  }

  pageState$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.route.paramMap.pipe(
        switchMap((params) => {
          const boardState$ = this.resolveBoardId$(params.get('boardId'), params.get('username')).pipe(
            switchMap((boardId) =>
              this.boardService.getBoard(boardId).pipe(
                tap((board) => {
                  this.insightsService.recordView(board.id, 'direct').subscribe({ error: () => {} });
                }),
                map((board): BoardPageState => ({ status: 'ready', board })),
                catchError(() => of<BoardPageState>({ status: 'missing' }))
              )
            )
          );
          return this.hasLoadedPageStateOnce
            ? boardState$
            : boardState$.pipe(startWith<BoardPageState>({ status: 'loading' }));
        }),
        tap((state) => {
          if (state.status !== 'loading') {
            this.hasLoadedPageStateOnce = true;
          }
          if (state.status === 'ready' && state.board.id !== this.boardIdentitySourceId) {
            this.boardIdentitySourceId = state.board.id;
            this.boardIdentityNameDraft = state.board.boardName || this.boardMenuLabel(state.board.id);
            this.boardIdentityPersistedName = this.boardIdentityNameDraft;
            this.boardIdentitySlugDraft = state.board.boardUrl;
            this.boardIdentityPersistedUrl = state.board.boardUrl;
          }
        })
      )
    )
  );

  widgets$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.route.paramMap.pipe(
        switchMap((params) =>
          this.resolveBoardId$(params.get('boardId'), params.get('username')).pipe(
            switchMap((boardId) =>
              this.boardService.getWidgets(boardId).pipe(
                map((widgets) => [...widgets].sort((a, b) => a.order - b.order)),
                catchError(() => of<Widget[]>([]))
              )
            )
          )
        )
      )
    )
  );

  trackWidget(index: number, widget: Widget) {
    return widget.id ?? index;
  }

  accountBoards: Array<{ id: string; label: string; route: string }> = [];
  accountUser = {
    name: 'An Vu',
    username: '@anvu',
  };

  constructor() {
    this.boardStore.boards$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((boards) => {
        this.accountBoards = boards.map((board) => ({
          id: board.id,
          label: board.boardName,
          route: `/b/${board.boardUrl}`,
        }));
      });
    this.userStore.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        if (!profile) {
          return;
        }
        this.accountUser = {
          name: profile.displayName,
          username: `@${profile.username}`,
        };

        const currentUsernameParam = this.route.snapshot.paramMap.get('username');
        const isUserMainRoute = !!this.route.snapshot.data['userMainRoute'];
        if (
          isUserMainRoute &&
          currentUsernameParam &&
          currentUsernameParam.toLowerCase() !== profile.username.toLowerCase()
        ) {
          this.router.navigate(['/', profile.username], { replaceUrl: true });
        }
      });
    this.boardStore.refreshBoards();
    this.userStore.refreshMyProfile();
  }

  boardMenuLabel(boardId: string) {
    return this.accountBoards.find((board) => board.id === boardId)?.label ?? boardId;
  }

  tileLayoutClass(layout: string) {
    if (layout === 'span-4') {
      return 'tile-span-4';
    }
    if (layout === 'span-1x2') {
      return 'tile-span-1x2';
    }
    if (layout === 'span-2x2') {
      return 'tile-span-2x2';
    }
    if (layout === 'span-2') {
      return 'tile-span-2';
    }
    return 'tile-span-1';
  }

  isReadOnlyView() {
    return !!this.route.snapshot?.data?.['readOnly'];
  }

  startWidgetEdit(board: Board, widgets: Widget[]) {
    this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget)).sort((a, b) => a.order - b.order);
    this.boardDraftName = board.name;
    this.boardDraftHeadline = board.headline;
    this.newWidgetDraft = this.createEmptyWidgetDraft();
    this.deletedWidgetIds = [];
    this.widgetSaveError = '';
    this.newWidgetValidationError = '';
    this.isAddWidgetExpanded = false;
    this.draftValidationErrors = new WeakMap<WidgetDraft, string>();
    this.activeWidgetSettingsId = null;
    this.isWidgetEditMode = true;
  }

  toggleAccountMenu() {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
  }

  closeAccountMenu() {
    this.isAccountMenuOpen = false;
  }

  toggleBoardIdentityMenu() {
    this.isBoardIdentityMenuOpen = !this.isBoardIdentityMenuOpen;
  }

  closeBoardIdentityMenu() {
    this.persistBoardUrlDraft();
    this.isBoardIdentityMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isAccountMenuOpen && !this.isBoardIdentityMenuOpen) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      this.closeAccountMenu();
      this.closeBoardIdentityMenu();
      return;
    }
    const accountMenuWrap = this.elementRef.nativeElement.querySelector('.account-menu-wrap');
    if (this.isAccountMenuOpen && (!accountMenuWrap || !accountMenuWrap.contains(target))) {
      this.closeAccountMenu();
    }
    const boardIdentityWrap = this.elementRef.nativeElement.querySelector('.board-identity-wrap');
    if (this.isBoardIdentityMenuOpen && (!boardIdentityWrap || !boardIdentityWrap.contains(target))) {
      this.closeBoardIdentityMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isAccountMenuOpen) {
      this.closeAccountMenu();
    }
    if (this.isBoardIdentityMenuOpen) {
      this.closeBoardIdentityMenu();
    }
  }

  cancelWidgetEdit() {
    this.isWidgetEditMode = false;
    this.isWidgetSaving = false;
    this.widgetSaveError = '';
    this.newWidgetValidationError = '';
    this.isAddWidgetExpanded = false;
    this.boardDraftName = '';
    this.boardDraftHeadline = '';
    this.widgetDrafts = [];
    this.activeWidgetSettingsId = null;
    this.newWidgetDraft = this.createEmptyWidgetDraft();
    this.deletedWidgetIds = [];
    this.draftValidationErrors = new WeakMap<WidgetDraft, string>();
  }

  deleteWidget(draft: WidgetDraft) {
    if (draft.id && this.activeWidgetSettingsId === draft.id) {
      this.activeWidgetSettingsId = null;
    }
    if (!draft.id) {
      this.widgetDrafts = this.widgetDrafts.filter((item) => item !== draft);
      this.widgetDrafts = this.withNormalizedOrder(this.widgetDrafts);
      return;
    }
    this.deletedWidgetIds = [...this.deletedWidgetIds, draft.id];
    this.widgetDrafts = this.widgetDrafts.filter((item) => item !== draft);
    this.widgetDrafts = this.withNormalizedOrder(this.widgetDrafts);
  }

  addNewWidget() {
    const validationMessage = this.getWidgetValidationMessage(this.newWidgetDraft);
    if (validationMessage) {
      this.newWidgetValidationError = validationMessage;
      return;
    }
    const draft = {
      ...this.newWidgetDraft,
      id: undefined,
      order: this.widgetDrafts.length,
      embedUrl: this.normalizeHttpUrl(this.newWidgetDraft.embedUrl) ?? this.newWidgetDraft.embedUrl,
      linkUrl: this.normalizeHttpUrl(this.newWidgetDraft.linkUrl) ?? this.newWidgetDraft.linkUrl,
    };
    this.widgetDrafts = [...this.widgetDrafts, draft];
    this.newWidgetDraft = this.createEmptyWidgetDraft();
    this.widgetSaveError = '';
    this.newWidgetValidationError = '';
    this.isAddWidgetExpanded = false;
  }

  openAddWidgetForm() {
    this.isAddWidgetExpanded = true;
    this.newWidgetValidationError = '';
  }

  moveWidget(draft: WidgetDraft, direction: -1 | 1) {
    if (this.isWidgetSaving) {
      return;
    }
    const currentIndex = this.widgetDrafts.indexOf(draft);
    if (currentIndex < 0) {
      return;
    }
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.widgetDrafts.length) {
      return;
    }

    const nextDrafts = [...this.widgetDrafts];
    [nextDrafts[currentIndex], nextDrafts[targetIndex]] = [nextDrafts[targetIndex], nextDrafts[currentIndex]];
    this.widgetDrafts = this.withNormalizedOrder(nextDrafts);
  }

  openWidgetSettings(draft: WidgetDraft) {
    if (this.isWidgetSaving || !draft.id) {
      return;
    }
    this.activeWidgetSettingsId = draft.id;
    this.draftValidationErrors.delete(draft);
  }

  isWidgetSettingsOpen(draft: WidgetDraft) {
    return !!draft.id && this.activeWidgetSettingsId === draft.id;
  }

  widgetPreviewFromDraft(draft: WidgetDraft, index: number): Widget {
    const payload = this.buildWidgetPayload(draft);
    return {
      id: draft.id ?? -(index + 1),
      type: draft.type,
      title: draft.title,
      layout: draft.layout,
      config: payload?.config ?? {},
      enabled: draft.enabled,
      order: draft.order,
    };
  }

  doneWidgetEdit(boardUrl: string) {
    const normalizedDrafts = this.withNormalizedOrder([...this.widgetDrafts]);
    this.widgetDrafts = normalizedDrafts;
    this.draftValidationErrors = new WeakMap<WidgetDraft, string>();
    this.newWidgetValidationError = '';
    const trimmedName = this.boardDraftName.trim();
    const trimmedHeadline = this.boardDraftHeadline.trim();
    if (!trimmedName || !trimmedHeadline) {
      this.widgetSaveError = 'Name and headline are required.';
      return;
    }

    for (const draft of normalizedDrafts) {
      const validationMessage = this.getWidgetValidationMessage(draft);
      if (validationMessage) {
        this.draftValidationErrors.set(draft, validationMessage);
        this.widgetSaveError = 'Fix highlighted widget fields before saving.';
        return;
      }
    }

    const updates = normalizedDrafts
      .filter((draft): draft is WidgetDraft & { id: number } => !!draft.id)
      .map((draft) => this.boardService.updateWidget(boardUrl, draft.id, this.buildWidgetPayload(draft)!));

    const creates = normalizedDrafts
      .filter((draft) => !draft.id)
      .map((draft) => this.boardService.createWidget(boardUrl, this.buildWidgetPayload(draft)!));

    const deletes = this.deletedWidgetIds.map((widgetId) => this.boardService.deleteWidget(boardUrl, widgetId));
    const boardUpdate = this.boardService.updateBoardMeta(boardUrl, {
      name: trimmedName,
      headline: trimmedHeadline,
    });
    const requests = [boardUpdate, ...deletes, ...updates, ...creates];

    this.isWidgetSaving = true;
    this.widgetSaveError = '';
    forkJoin(requests.length > 0 ? requests : [of(null)])
      .pipe(finalize(() => (this.isWidgetSaving = false)))
      .subscribe({
        next: () => {
          this.cancelWidgetEdit();
          this.reload$.next();
        },
        error: (error) => {
          this.widgetSaveError = error?.error?.message ?? 'Unable to save widget changes.';
        },
      });
  }

  onNewWidgetTypeChange() {
    this.resetWidgetConfigForType(this.newWidgetDraft);
    this.newWidgetValidationError = '';
  }

  onWidgetTypeChange(draft: WidgetDraft) {
    this.resetWidgetConfigForType(draft);
    this.draftValidationErrors.delete(draft);
  }

  onWidgetDraftFieldChange(draft: WidgetDraft) {
    this.draftValidationErrors.delete(draft);
    if (this.widgetSaveError === 'Fix highlighted widget fields before saving.') {
      this.widgetSaveError = '';
    }
  }

  onNewWidgetFieldChange() {
    this.newWidgetValidationError = '';
  }

  getDraftValidationError(draft: WidgetDraft) {
    return this.draftValidationErrors.get(draft) ?? '';
  }

  private persistBoardUrlDraft() {
    const boardSlug = this.boardIdentityPersistedUrl;
    if (!boardSlug) {
      return;
    }

    const normalizedName = this.boardIdentityNameDraft.trim();
    const normalizedUrl = this.normalizeBoardUrl(this.boardIdentitySlugDraft);
    if (!normalizedName || !normalizedUrl) {
      this.boardIdentityNameDraft = this.boardIdentityPersistedName;
      this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl;
      return;
    }

    if (
      normalizedName === this.boardIdentityPersistedName &&
      normalizedUrl === this.boardIdentityPersistedUrl
    ) {
      this.boardIdentityNameDraft = normalizedName;
      this.boardIdentitySlugDraft = normalizedUrl;
      return;
    }

    this.boardService
      .updateBoardIdentity(boardSlug, { boardName: normalizedName, boardUrl: normalizedUrl })
      .subscribe({
      next: (board) => {
        this.boardIdentityPersistedName = board.boardName || normalizedName;
        this.boardIdentityPersistedUrl = board.boardUrl;
        this.boardIdentityNameDraft = this.boardIdentityPersistedName;
        this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl;
        this.boardStore.updateBoardInStore(board);
        const currentRouteValue = this.route.snapshot.paramMap.get('boardId');
        if (currentRouteValue && currentRouteValue !== this.boardIdentityPersistedUrl) {
          this.router.navigate(['/b', this.boardIdentityPersistedUrl]);
        }
      },
      error: () => {
        this.boardIdentityNameDraft = this.boardIdentityPersistedName;
        this.boardIdentitySlugDraft = this.boardIdentityPersistedUrl;
      },
      });
  }

  private toWidgetDraft(widget: Widget): WidgetDraft {
    const places = Array.isArray(widget.config['places'])
      ? (widget.config['places'] as unknown[]).filter((place): place is string => typeof place === 'string')
      : [];
    return {
      id: widget.id,
      type: this.normalizeWidgetType(widget.type),
      title: widget.title,
      layout: widget.layout,
      enabled: widget.enabled,
      order: widget.order,
      embedUrl: typeof widget.config['embedUrl'] === 'string' ? widget.config['embedUrl'] : '',
      linkUrl: typeof widget.config['url'] === 'string' ? widget.config['url'] : '',
      placesText: places.join('\n'),
    };
  }

  private normalizeBoardUrl(rawValue: string) {
    const normalized = rawValue.trim().toLowerCase().replace(/\s+/g, '-');
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : '';
  }

  private createEmptyWidgetDraft(): WidgetDraft {
    return {
      type: 'embed',
      title: '',
      layout: 'span-1',
      enabled: true,
      order: 0,
      embedUrl: '',
      linkUrl: '',
      placesText: '',
    };
  }

  private buildWidgetPayload(draft: WidgetDraft): UpsertWidgetRequest | null {
    const base: Omit<UpsertWidgetRequest, 'config'> = {
      type: draft.type,
      title: draft.title.trim(),
      layout: draft.layout.trim(),
      enabled: draft.enabled,
      order: draft.order,
    };

    if (draft.type === 'embed') {
      const url = this.normalizeHttpUrl(draft.embedUrl);
      if (!url) {
        return null;
      }
      return {
        ...base,
        config: { embedUrl: url },
      };
    }

    if (draft.type === 'link') {
      const url = this.normalizeHttpUrl(draft.linkUrl);
      if (!url) {
        return null;
      }
      return {
        ...base,
        config: { url },
      };
    }

    if (draft.type === 'user-settings' || draft.type === 'admin-settings') {
      return {
        ...base,
        config: {},
      };
    }

    const places = draft.placesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (places.length === 0) {
      return null;
    }
    return {
      ...base,
      config: { places },
    };
  }

  private resetWidgetConfigForType(draft: WidgetDraft) {
    if (draft.type === 'embed') {
      draft.linkUrl = '';
      draft.placesText = '';
      return;
    }
    if (draft.type === 'link') {
      draft.embedUrl = '';
      draft.placesText = '';
      return;
    }
    if (draft.type === 'user-settings' || draft.type === 'admin-settings') {
      draft.embedUrl = '';
      draft.linkUrl = '';
      draft.placesText = '';
      return;
    }
    draft.embedUrl = '';
    draft.linkUrl = '';
  }

  private withNormalizedOrder(drafts: WidgetDraft[]): WidgetDraft[] {
    return drafts.map((draft, index) => ({ ...draft, order: index }));
  }

  private resolveBoardId$(routeParamBoardId: string | null, routeParamUsername: string | null) {
    const dataBoardId = this.route.snapshot?.data?.['boardId'];
    const systemRoute = this.route.snapshot?.data?.['systemRoute'];
    const userMainRoute = !!this.route.snapshot?.data?.['userMainRoute'];
    if (routeParamBoardId && routeParamBoardId.trim().length > 0) {
      return of(routeParamBoardId);
    }
    if (userMainRoute && routeParamUsername && routeParamUsername.trim().length > 0) {
      const username = routeParamUsername.trim().toLowerCase();
      return this.boardService.getUserMainBoard(username).pipe(
        map((result) => result.mainBoardUrl),
        catchError(() => of('__missing-user-main-board__'))
      );
    }
    if (typeof dataBoardId === 'string' && dataBoardId.trim().length > 0) {
      return of(dataBoardId);
    }
    if (systemRoute === 'main' || systemRoute === 'insights' || systemRoute === 'settings') {
      return this.boardService.getSystemRoutes().pipe(
        map((routes) => {
          if (systemRoute === 'main') {
            return routes.globalHomepageBoardUrl;
          }
          if (systemRoute === 'insights') {
            return routes.globalInsightsBoardUrl;
          }
          return routes.globalSettingsBoardUrl;
        }),
        catchError(() => of(systemRoute === 'main' ? 'home' : systemRoute === 'insights' ? 'insights' : 'settings'))
      );
    }
    return of('default');
  }

  private getWidgetValidationMessage(draft: WidgetDraft): string {
    if (draft.type === 'map') {
      const places = draft.placesText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (places.length === 0) {
        return 'Map widgets need at least one place.';
      }
      return '';
    }
    if (draft.type === 'embed') {
      return this.normalizeHttpUrl(draft.embedUrl) ? '' : 'Embed URL must be a valid web address.';
    }
    if (draft.type === 'user-settings' || draft.type === 'admin-settings') {
      return '';
    }
    return this.normalizeHttpUrl(draft.linkUrl) ? '' : 'Link URL must be a valid web address.';
  }

  private normalizeWidgetType(type: string): WidgetType {
    if (
      type === 'embed' ||
      type === 'map' ||
      type === 'link' ||
      type === 'user-settings' ||
      type === 'admin-settings'
    ) {
      return type;
    }
    return 'embed';
  }

  private normalizeHttpUrl(raw: string): string | null {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return null;
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    const candidate = hasScheme ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(candidate);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

}
