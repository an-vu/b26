import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { defer, of, Subject, throwError } from 'rxjs';

import { BoardPageComponent } from './board-page';
import { BoardService } from '../../services/board.service';
import type { Widget } from '../../models/widget';

describe('BoardPageComponent', () => {
  let component: BoardPageComponent;
  let fixture: ComponentFixture<BoardPageComponent>;
  let boardServiceStub: {
    getBoards: BoardService['getBoards'];
    getMyBoards: BoardService['getMyBoards'];
    getBoard: BoardService['getBoard'];
    getMyProfile: BoardService['getMyProfile'];
    getMyPreferences: BoardService['getMyPreferences'];
    updateBoard: BoardService['updateBoard'];
    updateBoardMeta: BoardService['updateBoardMeta'];
    updateBoardUrl: BoardService['updateBoardUrl'];
    updateBoardIdentity: BoardService['updateBoardIdentity'];
    getBoardPermissions: BoardService['getBoardPermissions'];
    getWidgets: BoardService['getWidgets'];
    createWidget: BoardService['createWidget'];
    updateWidget: BoardService['updateWidget'];
    deleteWidget: BoardService['deleteWidget'];
    deleteBoard: BoardService['deleteBoard'];
  };
  let updateWidgetCalls: Array<{ widgetId: number; order: number }> = [];

  const routeStub = {
    paramMap: of(convertToParamMap({ boardId: 'default' })),
    data: of({}),
    snapshot: {
      paramMap: convertToParamMap({ boardId: 'default' }),
      data: {},
    },
  };

  beforeEach(async () => {
    updateWidgetCalls = [];
    boardServiceStub = {
      getBoards: () =>
        of([
          { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An Vu', headline: 'Software Engineer' },
        ]),
      getMyBoards: () =>
        of([
          { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An Vu', headline: 'Software Engineer' },
        ]),
      getBoard: () =>
        of({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      getMyProfile: () =>
        of({
          userId: 'anvu',
          displayName: 'An Vu',
          username: 'anvu',
          email: 'anvu@local',
        }),
      getMyPreferences: () =>
        of({
          userId: 'anvu',
          username: 'anvu',
          mainBoardId: 'default',
          mainBoardUrl: 'default',
        }),
      updateBoard: () =>
        of({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      updateBoardMeta: () =>
        of({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      updateBoardUrl: () =>
        of({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      updateBoardIdentity: () =>
        of({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        }),
      getBoardPermissions: () => of({ canEdit: true }),
      getWidgets: () => of([]),
      createWidget: () =>
        of({
          id: 1,
          type: 'embed',
          title: 'Now Playing',
          layout: 'span-1',
          config: { embedUrl: 'https://example.com/embed' },
          enabled: true,
          order: 0,
        }),
      updateWidget: (_boardId: string, widgetId: number, payload) => {
        updateWidgetCalls.push({ widgetId, order: payload.order });
        return of({
          id: widgetId,
          type: payload.type,
          title: payload.title,
          layout: payload.layout,
          config: payload.config,
          enabled: payload.enabled,
          order: payload.order,
        } as Widget);
      },
      deleteWidget: () => of(undefined),
      deleteBoard: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [BoardPageComponent],
      providers: [
        { provide: BoardService, useValue: boardServiceStub },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();
  });

  it('requires confirmation and keeps the board when deletion is cancelled', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const remove = vi.spyOn(boardServiceStub, 'deleteBoard');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.onAccountBoardDelete('default', new MouseEvent('click'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Permanently delete'));
    expect(remove).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('shows asynchronous delete failures outside the account menu and prevents duplicate requests', async () => {
    const result = new Subject<void>();
    const remove = vi.spyOn(boardServiceStub, 'deleteBoard').mockReturnValue(result);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.isBoardIdentityMenuOpen = true;
    component.boardIdentityNameDraft = 'Unsaved name';
    component.onAccountBoardDelete('default', new MouseEvent('click'));
    component.onAccountBoardDelete('default', new MouseEvent('click'));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(component.canLeaveBoard()).toBe(false);
    result.error({ error: { errors: [{ message: 'Choose another main board first.' }] } });
    await fixture.whenStable();
    expect(component.isDeletingBoard).toBe(false);
    expect(component.isBoardIdentityMenuOpen).toBe(true);
    expect(component.boardIdentityNameDraft).toBe('Unsaved name');
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Unsaved changes'));
    expect(fixture.nativeElement.textContent).toContain('Choose another main board first.');
    confirm.mockRestore();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render loading state before board resolves', () => {
    boardServiceStub.getBoard = () =>
      defer(() =>
        Promise.resolve({
          id: 'default',
          boardName: 'Default',
          boardUrl: 'default',
          name: 'An Vu',
          headline: 'Software Engineer',
        })
      );

    fixture = TestBed.createComponent(BoardPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading...');
  });

  it('should render missing state when board request fails', () => {
    boardServiceStub.getBoard = () => throwError(() => new Error('boom'));

    fixture = TestBed.createComponent(BoardPageComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Board not found.');
  });

  it('should normalize local order when moving widgets down', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const widgets: Widget[] = [
      {
        id: 1,
        type: 'embed',
        title: 'One',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com/1' },
        enabled: true,
        order: 0,
      },
      {
        id: 2,
        type: 'embed',
        title: 'Two',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com/2' },
        enabled: true,
        order: 1,
      },
    ];

    component.startWidgetEdit(
      {
        id: 'default',
        boardName: 'Default',
        boardUrl: 'default',
        name: 'An Vu',
        headline: 'Software Engineer',
      },
      widgets
    );
    const firstDraft = component.widgetDrafts[0];
    component.moveWidget(firstDraft, 1);

    expect(component.widgetDrafts.map((draft) => draft.id)).toEqual([2, 1]);
    expect(component.widgetDrafts.map((draft) => draft.order)).toEqual([0, 1]);
    expect(updateWidgetCalls.length).toBe(0);
  });

  it('should sort widget drafts by order when entering edit mode', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const widgets: Widget[] = [
      {
        id: 10,
        type: 'map',
        title: 'Late',
        layout: 'span-1',
        config: { places: ['A'] },
        enabled: true,
        order: 5,
      },
      {
        id: 11,
        type: 'embed',
        title: 'Early',
        layout: 'span-1',
        config: { embedUrl: 'https://example.com' },
        enabled: true,
        order: 0,
      },
    ];

    component.startWidgetEdit(
      {
        id: 'default',
        boardName: 'Default',
        boardUrl: 'default',
        name: 'An Vu',
        headline: 'Software Engineer',
      },
      widgets
    );
    expect(component.widgetDrafts.map((draft) => draft.id)).toEqual([11, 10]);
    expect(component.widgetDrafts.map((draft) => draft.order)).toEqual([0, 5]);
  });
  it('persists the main board and refreshes the account menu only on success', () => {
    const update = vi.fn(() => of({ userId: 'anvu', username: 'anvu', mainBoardId: 'second', mainBoardUrl: 'second' }));
    Object.assign(boardServiceStub, { updateMyPreferences: update });
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.onAccountBoardSetMain('second', new MouseEvent('click'));
    expect(update).toHaveBeenCalledWith({ mainBoardId: 'second' });
    expect(component.accountMainBoardId).toBe('second');
    expect(component.isSettingMainBoard).toBe(false);
  });

  it('keeps the selected main board on failure and shows the error', () => {
    Object.assign(boardServiceStub, { updateMyPreferences: () => throwError(() => ({ error: { message: 'Unable to save preference' } })) });
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.onAccountBoardSetMain('second', new MouseEvent('click'));
    expect(component.accountMainBoardId).toBe('default');
    expect(component.accountActionError).toBe('Unable to save preference');
  });

  it('keeps identity drafts visible after a failed save', () => {
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ error: { message: 'URL already in use' } }));
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.boardIdentitySlugDraft = 'taken-url';
    component.saveIdentity();
    expect(component.boardIdentitySlugDraft).toBe('taken-url');
    expect(component.identitySaveError).toBe('URL already in use');
    expect(component.hasUnsavedChanges).toBe(true);
  });

  it('detects changed drafts but leaves an untouched editor clean', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.startWidgetEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: 'Description', version: 1 }, []);
    expect(component.hasUnsavedChanges).toBe(false);
    component.boardDraftName = 'Changed';
    expect(component.hasUnsavedChanges).toBe(true);
    component.cancelWidgetEdit();
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('loads a coherent editor snapshot instead of editing the displayed stale board', () => {
    Object.assign(boardServiceStub, {
      getEditor: () => of({
        board: { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Latest title', headline: 'Latest description', version: 9 },
        widgets: [],
      }),
    });
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.requestWidgetEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Stale title', headline: 'Stale description' });
    expect(component.boardDraftName).toBe('Latest title');
    expect(component.isWidgetEditMode).toBe(true);
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('saves appearance-only changes with the board revision and clears the dirty state', () => {
    const board = { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 8 };
    boardServiceStub.getBoard = () => of(board);
    const save = vi.fn((_slug, request) => of({ ...board, ...request, version: 9 }));
    boardServiceStub.updateBoardIdentity = save;
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.boardThemeToggleDraft = true;
    component.boardPatternDraft = 'grid';
    component.boardRadiusStepDraft = 3;
    expect(component.hasUnsavedChanges).toBe(true);
    component.saveIdentity();
    expect(save).toHaveBeenCalledWith('default', expect.objectContaining({
      version: 8, appearance: { theme: 'dark', radiusStep: 3, backgroundColor: '#ffffff', pattern: 'grid' },
    }));
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('keeps a failed appearance preview and restores saved values on Cancel', () => {
    const appearance = { theme: 'dark' as const, radiusStep: 3 as const, backgroundColor: '#e6f0ff', pattern: 'dots' as const };
    boardServiceStub.getBoard = () => of({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 2, appearance });
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ status: 409, error: { message: 'Board changed in another tab' } }));
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.appearanceDraft).toEqual(appearance);
    component.resetAppearance();
    expect(component.hasUnsavedChanges).toBe(true);
    component.saveIdentity();
    expect(component.appearanceDraft.theme).toBe('light');
    expect(component.hasUnsavedChanges).toBe(true);
    expect(component.identitySaveError).toContain('another tab');
    component.cancelIdentityEdit();
    expect(component.appearanceDraft).toEqual(appearance);
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('keeps appearance drafts when the menu closes and blocks entering the widget editor', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.boardPatternDraft = 'checkered';
    component.closeBoardIdentityMenu();
    expect(component.hasUnsavedChanges).toBe(true);
    component.requestWidgetEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '' });
    expect(component.isWidgetEditMode).toBe(false);
    expect(component.widgetSaveError).toContain('board settings');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(component.canLeaveBoard()).toBe(false);
    confirm.mockRestore();
  });

  it('waits for the latest revision after Cancel before reopening settings', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const reload = new Subject<import('../../models/board').Board>();
    boardServiceStub.getBoard = () => reload;
    component.boardPatternDraft = 'grid';
    component.cancelIdentityEdit();
    expect(component.isSettingsReloading).toBe(true);
    component.toggleBoardIdentityMenu();
    expect(component.isBoardIdentityMenuOpen).toBe(false);
    reload.next({ id: 'default', boardName: 'Latest name', boardUrl: 'default', name: 'Title', headline: '', version: 9,
      appearance: { theme: 'dark', radiusStep: 3, backgroundColor: '#e6f0ff', pattern: 'dots' } });
    expect(component.isSettingsReloading).toBe(false);
    component.toggleBoardIdentityMenu();
    expect(component.isBoardIdentityMenuOpen).toBe(true);
    expect(component.boardIdentityNameDraft).toBe('Latest name');
    expect(component.appearanceDraft.pattern).toBe('dots');
    expect(component.hasUnsavedChanges).toBe(false);
  });

  it('moves focus into settings and restores it on Escape without discarding the draft', () => {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.canEditBoard = true;
    fixture.detectChanges();
    component.toggleBoardIdentityMenu();
    expect(document.activeElement?.getAttribute('name')).toBe('board-identity-name');
    component.boardPatternDraft = 'grid';
    component.onEscapeKey();
    fixture.detectChanges();
    expect(document.activeElement?.classList.contains('board-identity-button')).toBe(true);
    expect(component.settingsFeedback).toBe('Unsaved board settings');
    expect(component.boardPatternDraft).toBe('grid');
  });

  it('announces pending, saved, and failed settings without clearing failed drafts', () => {
    const saved = new Subject<import('../../models/board').Board>();
    boardServiceStub.updateBoardIdentity = () => saved;
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.boardPatternDraft = 'grid';
    component.saveIdentity();
    expect(component.settingsFeedback).toBe('Saving board settings…');
    saved.next({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 2,
      appearance: component.appearanceDraft });
    saved.complete();
    expect(component.settingsFeedback).toBe('Board settings saved');
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ error: { message: 'Connection failed' } }));
    component.boardPatternDraft = 'dots';
    component.saveIdentity();
    expect(component.settingsFeedback).toContain('not saved');
    expect(component.boardPatternDraft).toBe('dots');
  });

  it('renders an asynchronous editor failure and enables retry without another user action', async () => {
    const save = new Subject<import('../../models/board').BoardEdit>();
    Object.assign(boardServiceStub, { saveEditor: () => save });
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.canEditBoard = true;
    component.startWidgetEdit({ id: 'default', boardName: 'Default', boardUrl: 'default',
      name: 'Original title', headline: 'Description', version: 1 }, []);
    component.boardDraftName = 'Retained draft';
    component.doneWidgetEdit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saving...');
    save.error({ error: { message: 'Temporarily unavailable' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Temporarily unavailable');
    const done = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.trim() === 'Done') as HTMLButtonElement;
    expect(done.disabled).toBe(false);
    expect(component.boardDraftName).toBe('Retained draft');
    expect(component.hasUnsavedChanges).toBe(true);
  });

});
