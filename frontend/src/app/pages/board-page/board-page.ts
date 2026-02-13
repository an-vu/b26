import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap, tap } from 'rxjs/operators';
import { catchError, finalize, forkJoin, map, of, startWith, Subject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { BoardService } from '../../services/board.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { Board } from '../../models/board';
import type { UpsertWidgetRequest, Widget } from '../../models/widget';
import { WidgetHostComponent } from '../../widgets/widget-host/widget-host';

type BoardPageState =
  | { status: 'loading' }
  | { status: 'ready'; board: Board }
  | { status: 'missing' };

type WidgetType = 'embed' | 'map' | 'link';
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
  imports: [CommonModule, FormsModule, RouterLink, WidgetHostComponent],
  templateUrl: './board-page.html',
  styleUrl: './board-page.css',
})
export class BoardPageComponent {
  private route = inject(ActivatedRoute);
  private boardService = inject(BoardService);
  private analyticsService = inject(AnalyticsService);
  private elementRef = inject(ElementRef<HTMLElement>);
  private reload$ = new Subject<void>();
  private hasLoadedPageStateOnce = false;

  isWidgetEditMode = false;
  isWidgetSaving = false;
  isAccountMenuOpen = false;
  widgetSaveError = '';
  newWidgetValidationError = '';
  boardDraftName = '';
  boardDraftHeadline = '';
  widgetDrafts: WidgetDraft[] = [];
  activeWidgetSettingsId: number | null = null;
  newWidgetDraft: WidgetDraft = this.createEmptyWidgetDraft();
  deletedWidgetIds: number[] = [];
  private draftValidationErrors = new WeakMap<WidgetDraft, string>();

  pageState$ = this.reload$.pipe(
    startWith(undefined),
    switchMap(() =>
      this.route.paramMap.pipe(
        switchMap((params) => {
          const boardState$ = this.boardService.getBoard(this.resolveBoardId(params.get('boardId'))).pipe(
            tap((board) => {
              this.analyticsService.recordView(board.id, 'direct').subscribe({ error: () => {} });
            }),
            map((board): BoardPageState => ({ status: 'ready', board })),
            catchError(() => of<BoardPageState>({ status: 'missing' }))
          );
          return this.hasLoadedPageStateOnce
            ? boardState$
            : boardState$.pipe(startWith<BoardPageState>({ status: 'loading' }));
        }),
        tap((state) => {
          if (state.status !== 'loading') {
            this.hasLoadedPageStateOnce = true;
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
          this.boardService
            .getWidgets(this.resolveBoardId(params.get('boardId')))
            .pipe(
              map((widgets) => [...widgets].sort((a, b) => a.order - b.order)),
              catchError(() => of<Widget[]>([]))
            )
        )
      )
    )
  );

  trackWidget(index: number, widget: Widget) {
    return widget.id ?? index;
  }

  accountBoards = [
    { label: 'Default', route: '/b/default' },
    { label: 'Berkshire', route: '/b/berkshire' },
    { label: 'Union Pacific', route: '/b/union-pacific' },
  ];

  tileLayoutClass(layout: string) {
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

  isHomeBoard(board: Board) {
    return board.id === 'home';
  }

  startWidgetEdit(board: Board, widgets: Widget[]) {
    this.widgetDrafts = widgets.map((widget) => this.toWidgetDraft(widget)).sort((a, b) => a.order - b.order);
    this.boardDraftName = board.name;
    this.boardDraftHeadline = board.headline;
    this.newWidgetDraft = this.createEmptyWidgetDraft();
    this.deletedWidgetIds = [];
    this.widgetSaveError = '';
    this.newWidgetValidationError = '';
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isAccountMenuOpen) {
      return;
    }
    const target = event.target;
    const menuWrap = this.elementRef.nativeElement.querySelector('.account-menu-wrap');
    if (!(target instanceof Node) || !menuWrap || !menuWrap.contains(target)) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isAccountMenuOpen) {
      this.closeAccountMenu();
    }
  }

  cancelWidgetEdit() {
    this.isWidgetEditMode = false;
    this.isWidgetSaving = false;
    this.widgetSaveError = '';
    this.newWidgetValidationError = '';
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

  doneWidgetEdit(boardId: string) {
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
      .map((draft) => this.boardService.updateWidget(boardId, draft.id, this.buildWidgetPayload(draft)!));

    const creates = normalizedDrafts
      .filter((draft) => !draft.id)
      .map((draft) => this.boardService.createWidget(boardId, this.buildWidgetPayload(draft)!));

    const deletes = this.deletedWidgetIds.map((widgetId) => this.boardService.deleteWidget(boardId, widgetId));
    const boardUpdate = this.boardService.updateBoardMeta(boardId, {
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

  onBoardNameInput(event: Event) {
    if (!this.isWidgetEditMode) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      this.boardDraftName = target.textContent ?? '';
    }
  }

  onBoardHeadlineInput(event: Event) {
    if (!this.isWidgetEditMode) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement) {
      this.boardDraftHeadline = target.textContent ?? '';
    }
  }

  getDraftValidationError(draft: WidgetDraft) {
    return this.draftValidationErrors.get(draft) ?? '';
  }

  private toWidgetDraft(widget: Widget): WidgetDraft {
    const places = Array.isArray(widget.config['places'])
      ? (widget.config['places'] as unknown[]).filter((place): place is string => typeof place === 'string')
      : [];
    return {
      id: widget.id,
      type: widget.type === 'map' ? 'map' : widget.type === 'link' ? 'link' : 'embed',
      title: widget.title,
      layout: widget.layout,
      enabled: widget.enabled,
      order: widget.order,
      embedUrl: typeof widget.config['embedUrl'] === 'string' ? widget.config['embedUrl'] : '',
      linkUrl: typeof widget.config['url'] === 'string' ? widget.config['url'] : '',
      placesText: places.join('\n'),
    };
  }

  private createEmptyWidgetDraft(): WidgetDraft {
    return {
      type: 'embed',
      title: 'New widget',
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
    draft.embedUrl = '';
    draft.linkUrl = '';
  }

  private withNormalizedOrder(drafts: WidgetDraft[]): WidgetDraft[] {
    return drafts.map((draft, index) => ({ ...draft, order: index }));
  }

  private resolveBoardId(routeParamBoardId: string | null): string {
    const dataBoardId = this.route.snapshot?.data?.['boardId'];
    if (routeParamBoardId && routeParamBoardId.trim().length > 0) {
      return routeParamBoardId;
    }
    if (typeof dataBoardId === 'string' && dataBoardId.trim().length > 0) {
      return dataBoardId;
    }
    return 'default';
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
    return this.normalizeHttpUrl(draft.linkUrl) ? '' : 'Link URL must be a valid web address.';
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
