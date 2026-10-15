import { By } from '@angular/platform-browser';
import { AppearanceSettingsComponent } from '../../components/appearance-settings/appearance-settings';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { vi } from 'vitest';
import { EMPTY, defer, of, Subject, throwError } from 'rxjs';

import { BoardPageComponent } from './board-page';
import { BoardService } from '../../services/board.service';
import { UserStoreService } from '../../services/user-store.service';
import type { BoardEditorStore } from './board-editor.store';
import type { Widget } from '../../models/widget';

describe('BoardPageComponent', () => {
  let component: BoardPageComponent;
  let fixture: ComponentFixture<BoardPageComponent>;
  let store: BoardEditorStore;
  let boardServiceStub: {
    getMyBoards: BoardService['getMyBoards'];
    getBoard: BoardService['getBoard'];
    getMyProfile: BoardService['getMyProfile'];
    getMyPreferences: BoardService['getMyPreferences'];
    getHomeAppearance: BoardService['getHomeAppearance'];
    updateBoardIdentity: BoardService['updateBoardIdentity'];
    getBoardPermissions: BoardService['getBoardPermissions'];
    getWidgets: BoardService['getWidgets'];
    deleteBoard: BoardService['deleteBoard'];
  };

  const routeStub = {
    paramMap: of(convertToParamMap({ boardId: 'default' })),
    data: of({}),
    snapshot: {
      paramMap: convertToParamMap({ boardId: 'default' }),
      data: {},
    },
  };

  beforeEach(async () => {
    boardServiceStub = {
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
      getHomeAppearance: () => EMPTY,
      getMyPreferences: () =>
        of({
          userId: 'anvu',
          username: 'anvu',
          mainBoardId: 'default',
          mainBoardUrl: 'default',
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

  function create() {
    fixture = TestBed.createComponent(BoardPageComponent);
    component = fixture.componentInstance;
    store = component.store;
    fixture.detectChanges();
  }

  it('opens the sidebar widget library only in Edit and adds a selected widget to the draft', () => {
    create();
    expect(fixture.nativeElement.querySelector('app-widget-library')).toBeNull();
    store.startEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An Vu', headline: 'Hello', version: 1 }, []);
    fixture.detectChanges();
    const rail = fixture.nativeElement.querySelector('.board-rail');
    expect(rail.classList.contains('is-editing')).toBe(true);
    expect(rail.querySelector('.profile-handle')).toBeNull();
    expect(rail.querySelector('.profile-stats')).toBeNull();
    expect(rail.querySelector('input[aria-label="Profile name"]')?.classList.contains('app-textbox')).toBe(true);
    expect(rail.querySelector('textarea[aria-label="Profile description"]')?.getAttribute('rows')).toBe('3');
    expect(rail.querySelector('input[aria-label="Website or social URL"]')?.getAttribute('placeholder')).toBe('Link');
    expect(rail.querySelector('.widget-library-scroll')).not.toBeNull();
    expect(rail.querySelectorAll('.widget-library-preview')).toHaveLength(3);
    expect(rail.querySelectorAll('.widget-library-preview app-widget-host')).toHaveLength(3);
    expect(rail.querySelector('app-link-widget')).not.toBeNull();
    expect(rail.querySelector('app-embed-widget')).not.toBeNull();
    expect(rail.querySelector('app-map-widget')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.add-widget-tile')).toBeNull();
    for (const label of ['Social', 'Embed', 'Map']) {
      rail.querySelector(`button[aria-label="Add ${label} widget"]`).click(); fixture.detectChanges();
    }
    expect(store.drafts().map(draft => draft.type)).toEqual(['link', 'embed', 'map']);
    expect(store.drafts().map(draft => draft.order)).toEqual([0, 1, 2]);
    expect(store.drafts().every(draft => draft.layout === 'span-1')).toBe(true);
    expect(rail.querySelector('.widget-library-form')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.widget-edit-tile')).toHaveLength(3);
    fixture.nativeElement.querySelector('.widget-edit-tile').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.widget-editor-back input')?.getAttribute('placeholder')).toBe('Social media link');
    expect(store.selectedDraft()).toBe(store.drafts()[0]);
    // The enlarged back preserves the front's proportions, including rectangular sources.
    component.editorMotion.size = 440;
    component.editorMotion.sourceSize = { width: 220, height: 110 };
    component['cdr'].markForCheck(); fixture.detectChanges();
    expect(component.editorMotion.radius).toBe(`${component.boardRadius * 2}px / ${component.boardRadius * 4}px`);
    expect(component.editorMotion.panelInset).toBe(`${component.widgetEditorInset * 4}px ${component.widgetEditorInset * 2}px`);
    expect(fixture.nativeElement.querySelector('.widget-editor-back').style.getPropertyValue('--panel-padding')).toBe(component.editorMotion.panelInset);
    expect(fixture.nativeElement.querySelector('.widget-editor-back').style.borderRadius).toBe(component.editorMotion.radius);

    const grid = fixture.nativeElement.querySelector('.board-grid');
    expect(grid.classList.contains('is-editing-widget')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.widget-editor-backdrop')).toHaveLength(1);
    expect(grid.querySelector('.widget-editor-backdrop')).toBeNull();
    expect(grid.hasAttribute('inert')).toBe(true);
    expect(rail.hasAttribute('inert')).toBe(false);
    const input = fixture.nativeElement.querySelector('.widget-editor-back input') as HTMLInputElement;
    input.value = 'example.com/me'; input.dispatchEvent(new Event('input'));
    expect(store.drafts()[0].linkUrl).toBe('example.com/me');
    store.updateDraft(store.drafts()[0], { title: 'Edited draft' });
    fixture.nativeElement.querySelector('.widget-editor-done').click(); fixture.detectChanges();
    expect(store.selectedDraft()).toBeUndefined();
    expect(store.editing()).toBe(true);
    expect(store.drafts()[0].title).toBe('Edited draft');
    expect(grid.hasAttribute('inert')).toBe(false);
    fixture.nativeElement.querySelector('.widget-edit-tile').click(); fixture.detectChanges();
    store.updateDraft(store.drafts()[0], { title: 'Discard this change' });
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedDraft()).toBeUndefined();
    expect(store.drafts()[0].title).toBe('Edited draft');

    store.widgetsSaving.set(true); fixture.detectChanges();
    rail.querySelector('button[aria-label="Add Social widget"]').click();
    expect(store.drafts()).toHaveLength(3);
    store.cancelEdit(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-widget-library')).toBeNull();
  });

  it('requires confirmation and keeps the board when deletion is cancelled', () => {
    create();
    const remove = vi.spyOn(boardServiceStub, 'deleteBoard');
    const confirm = vi.spyOn(window, 'confirm');
    store.requestBoardDelete('default');
    expect(store.pendingDelete()?.boardUrl).toBe('default');
    expect(confirm).not.toHaveBeenCalled();
    store.cancelBoardDelete();
    store.confirmBoardDelete();
    expect(store.pendingDelete()).toBeNull();
    expect(remove).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('shows asynchronous delete failures outside the account menu and prevents duplicate requests', async () => {
    const result = new Subject<void>();
    const remove = vi.spyOn(boardServiceStub, 'deleteBoard').mockReturnValue(result);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    create();
    store.settingsOpen.set(true);
    component.settings.name.set('Unsaved name');
    store.requestBoardDelete('default');
    expect(remove).not.toHaveBeenCalled();
    store.confirmBoardDelete();
    store.confirmBoardDelete();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(component.canLeaveBoard()).toBe(false);
    result.error({ error: { errors: [{ message: 'Choose another main board first.' }] } });
    await fixture.whenStable();
    expect(store.deletingBoard()).toBe(false);
    expect(store.settingsOpen()).toBe(true);
    expect(component.settings.name()).toBe('Unsaved name');
    expect(store.pendingDelete()?.boardUrl).toBe('default');
    expect(fixture.nativeElement.textContent).toContain('Choose another main board first.');
    confirm.mockRestore();
  });

  it('should create', () => {
    create();
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

    create();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Loading...');
  });

  it('should render missing state when board request fails', () => {
    boardServiceStub.getBoard = () => throwError(() => ({ status: 404 }));

    create();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Board not found.');
  });

  const board = { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An Vu', headline: 'Software Engineer' };
  const embed = (id: number, title: string, order: number): Widget =>
    ({ id, type: 'embed', title, layout: 'span-1', config: { embedUrl: `https://example.com/${id}` }, enabled: true, order });

  it('should normalize local order when moving widgets down', () => {
    create();
    store.startEdit(board, [embed(1, 'One', 0), embed(2, 'Two', 1)]);
    store.moveDraft(store.drafts()[0], 1);
    expect(store.drafts().map((draft) => draft.id)).toEqual([2, 1]);
    expect(store.drafts().map((draft) => draft.order)).toEqual([0, 1]);
  });

  it('should sort widget drafts by order when entering edit mode', () => {
    create();
    store.startEdit(board, [{ ...embed(10, 'Late', 5), type: 'map', config: { places: ['A'] } }, embed(11, 'Early', 0)]);
    expect(store.drafts().map((draft) => draft.id)).toEqual([11, 10]);
    expect(store.drafts().map((draft) => draft.order)).toEqual([0, 5]);
  });

  it('persists the main board and refreshes the account menu only on success', () => {
    const update = vi.fn(() => of({ userId: 'anvu', username: 'anvu', mainBoardId: 'second', mainBoardUrl: 'second' }));
    Object.assign(boardServiceStub, { updateMyPreferences: update });
    create();
    store.setMainBoard('second');
    expect(update).toHaveBeenCalledWith({ mainBoardId: 'second' });
    expect(store.mainBoardId()).toBe('second');
    expect(store.settingMainBoard()).toBe(false);
  });

  it('keeps the selected main board on failure and shows the error', () => {
    Object.assign(boardServiceStub, { updateMyPreferences: () => throwError(() => ({ error: { message: 'Unable to save preference' } })) });
    create();
    TestBed.inject(UserStoreService).setMainBoardId('default');
    store.setMainBoard('second');
    expect(store.mainBoardId()).toBe('default');
    expect(store.accountActionError()).toBe('Unable to save preference');
  });

  it('keeps identity drafts visible after a failed save', () => {
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ error: { message: 'URL already in use' } }));
    create();
    component.settings.slug.set('taken-url');
    component.saveSettings();
    expect(component.settings.slug()).toBe('taken-url');
    expect(store.identityError()).toBe('URL already in use');
    expect(store.hasUnsavedChanges()).toBe(true);
  });

  it('detects changed drafts but leaves an untouched editor clean', () => {
    create();
    store.startEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: 'Description', version: 1 }, []);
    expect(store.hasUnsavedChanges()).toBe(false);
    store.boardName.set('Changed');
    expect(store.hasUnsavedChanges()).toBe(true);
    store.cancelEdit();
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('loads a coherent editor snapshot instead of editing the displayed stale board', () => {
    Object.assign(boardServiceStub, {
      getEditor: () => of({
        board: { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Latest title', headline: 'Latest description', version: 9 },
        widgets: [],
      }),
    });
    create();
    store.requestEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Stale title', headline: 'Stale description' });
    expect(store.boardName()).toBe('Latest title');
    expect(store.editing()).toBe(true);
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('saves appearance-only changes with the board revision and clears the dirty state', () => {
    const board = { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 8 };
    boardServiceStub.getBoard = () => of(board);
    const save = vi.fn((_slug, request) => of({ ...board, ...request, version: 9 }));
    boardServiceStub.updateBoardIdentity = save;
    create();
    component.settings.patchAppearance({ theme: 'dark', pattern: 'grid', radiusStep: 3 });
    expect(store.hasUnsavedChanges()).toBe(true);
    component.saveSettings();
    expect(save).toHaveBeenCalledWith('default', expect.objectContaining({
      version: 8, appearance: { spacingStep: 2, themeFamily: 'berry', theme: 'dark', radiusStep: 3, backgroundColor: '#f9f8f6', pattern: 'grid', patternIntensity: 'light' },
    }));
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it.each(['aero', 'aqua', 'omakase', 'kiwi'] as const)('automatically saves the selected %s family', (family) => {
    const board = { id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 4 };
    boardServiceStub.getBoard = () => of(board);
    const save = vi.fn((_slug, request) => of({ ...board, ...request, version: 5 }));
    boardServiceStub.updateBoardIdentity = save;
    create();
    component.changeAppearance({ ...component.settings.appearance(), themeFamily: family });
    fixture.detectChanges();
    expect(component.settings.theme().id).toBe(family);
    // The board shows its own theme family right away.
    expect(fixture.nativeElement.querySelector('main').dataset.theme).toBe(family);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('default', expect.objectContaining({
      appearance: expect.objectContaining({ themeFamily: family }), version: 4,
    }));
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('saves pattern intensity emitted by the shared appearance controls', () => {
    create();
    component.toggleBoardIdentityMenu();
    fixture.detectChanges();
    const controls = fixture.debugElement.query(By.directive(AppearanceSettingsComponent)).componentInstance as AppearanceSettingsComponent;
    const intensity = () => component.settings.appearance().patternIntensity;
    controls.selectPattern('stars');
    fixture.detectChanges();
    expect(intensity()).toBe('light');
    controls.selectPattern('stars');
    fixture.detectChanges();
    expect(intensity()).toBe('medium');
    controls.selectPattern('stars');
    fixture.detectChanges();
    expect(intensity()).toBe('heavy');
    controls.selectPattern('sakura');
    fixture.detectChanges();
    expect(intensity()).toBe('light');
  });

  it('keeps a failed appearance preview and restores saved values on Cancel', () => {
    const appearance = { theme: 'dark' as const, radiusStep: 3 as const, backgroundColor: '#e6f0ff', pattern: 'dots' as const };
    boardServiceStub.getBoard = () => of({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 2, appearance });
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ status: 409, error: { message: 'Board changed in another tab' } }));
    create();
    const saved = { spacingStep: 2, themeFamily: 'berry', ...appearance, pattern: 'stars', patternIntensity: 'light' };
    expect(component.settings.appearance()).toEqual(saved);
    component.resetAppearance();
    expect(store.hasUnsavedChanges()).toBe(true);
    component.saveSettings();
    expect(component.settings.appearance().theme).toBe('light');
    expect(store.hasUnsavedChanges()).toBe(true);
    expect(store.identityError()).toContain('another tab');
    store.cancelSettings();
    expect(component.settings.appearance()).toEqual(saved);
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('keeps appearance drafts when the menu closes and blocks entering the widget editor', () => {
    create();
    component.settings.patchAppearance({ pattern: 'checkered' });
    component.closeBoardIdentityMenu();
    expect(store.hasUnsavedChanges()).toBe(true);
    store.requestEdit({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '' });
    expect(store.editing()).toBe(false);
    expect(store.widgetError()).toContain('board settings');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(component.canLeaveBoard()).toBe(false);
    confirm.mockRestore();
  });

  it('waits for the latest revision after Cancel before reopening settings', () => {
    create();
    const reload = new Subject<import('../../models/board').Board>();
    boardServiceStub.getBoard = () => reload;
    component.settings.patchAppearance({ pattern: 'grid' });
    store.cancelSettings();
    expect(store.settingsReloading()).toBe(true);
    component.toggleBoardIdentityMenu();
    expect(store.settingsOpen()).toBe(false);
    reload.next({ id: 'default', boardName: 'Latest name', boardUrl: 'default', name: 'Title', headline: '', version: 9,
      appearance: { theme: 'dark', radiusStep: 3, backgroundColor: '#e6f0ff', pattern: 'dots' } });
    expect(store.settingsReloading()).toBe(false);
    component.toggleBoardIdentityMenu();
    expect(store.settingsOpen()).toBe(true);
    expect(component.settings.name()).toBe('Latest name');
    expect(component.settings.appearance().pattern).toBe('stars');
    expect(store.hasUnsavedChanges()).toBe(false);
  });

  it('moves focus into settings and restores it on Escape without discarding the draft', async () => {
    create();
    component.toggleBoardIdentityMenu();
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('name')).toBe('board-identity-name');
    component.settings.patchAppearance({ pattern: 'grid' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(document.activeElement?.classList.contains('board-identity-button')).toBe(true);
    expect(store.settingsFeedback()).toBe('Unsaved board settings');
    expect(component.settings.appearance().pattern).toBe('grid');
  });

  it('announces pending, saved, and failed settings without clearing failed drafts', () => {
    const saved = new Subject<import('../../models/board').Board>();
    boardServiceStub.updateBoardIdentity = () => saved;
    create();
    component.settings.patchAppearance({ pattern: 'grid' });
    component.saveSettings();
    expect(store.settingsFeedback()).toBe('Saving board settings…');
    saved.next({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'Title', headline: '', version: 2,
      appearance: component.settings.appearance() });
    saved.complete();
    expect(store.settingsFeedback()).toBe('Board settings saved');
    boardServiceStub.updateBoardIdentity = () => throwError(() => ({ error: { message: 'Connection failed' } }));
    component.settings.patchAppearance({ pattern: 'dots' });
    component.saveSettings();
    expect(store.settingsFeedback()).toContain('not saved');
    expect(component.settings.appearance().pattern).toBe('dots');
  });

  it('autosaves settings without closing the panel and reuses the returned version', () => {
    const pending = new Subject<import('../../models/board').Board>();
    const update = vi.fn((_url: string, _request: import('../../models/board').UpdateBoardIdentityRequest) => pending);
    boardServiceStub.updateBoardIdentity = update;
    create();
    store.settingsOpen.set(true);
    component.changeAppearance({ ...component.settings.appearance(), pattern: 'snow', patternIntensity: 'light' });
    expect(update).toHaveBeenCalledTimes(1);
    component.saveSettings();
    expect(update).toHaveBeenCalledTimes(1);
    pending.next({ id: 'default', boardName: 'Default', boardUrl: 'default', name: 'An Vu', headline: '', version: 7, appearance: component.settings.appearance() });
    pending.complete();
    expect(store.settingsOpen()).toBe(true);
    expect(component.settings.changed()).toBe(false);
    component.settings.patchAppearance({ backgroundColor: '#a64ce6' });
    component.saveSettings();
    expect(update.mock.calls[1]?.[1]).toMatchObject({ version: 7, appearance: { backgroundColor: '#a64ce6' } });
  });

  it('retains failed automatic settings and lets the user retry', () => {
    boardServiceStub.updateBoardIdentity = () => throwError(() => new Error('offline'));
    create();
    component.changeAppearance({ ...component.settings.appearance(), pattern: 'rainfall', patternIntensity: 'light' });
    expect(store.identityError()).toBeTruthy();
    expect(component.settings.appearance().pattern).toBe('rainfall');
    expect(component.settings.changed()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Retry saving');
  });

  it('renders an asynchronous editor failure and enables retry without another user action', async () => {
    const save = new Subject<import('../../models/board').BoardEdit>();
    Object.assign(boardServiceStub, { saveEditor: () => save });
    create();
    store.startEdit({ id: 'default', boardName: 'Default', boardUrl: 'default',
      name: 'Original title', headline: 'Description', version: 1 }, []);
    store.boardName.set('Retained draft');
    store.saveEdit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Saving...');
    save.error({ error: { message: 'Temporarily unavailable' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Temporarily unavailable');
    const done = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find(button => (button as HTMLButtonElement).textContent?.trim() === 'Save') as HTMLButtonElement;
    expect(done.disabled).toBe(false);
    expect(store.boardName()).toBe('Retained draft');
    expect(store.hasUnsavedChanges()).toBe(true);
  });
});
