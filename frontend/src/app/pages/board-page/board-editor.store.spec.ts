import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import type { AuthUser } from '../../models/auth';
import type { Board, BoardEdit } from '../../models/board';
import type { Widget } from '../../models/widget';
import { AuthService } from '../../services/auth.service';
import { BoardStoreService } from '../../services/board-store.service';
import { BoardService } from '../../services/board.service';
import { InsightsService } from '../../services/insights.service';
import { UserStoreService } from '../../services/user-store.service';
import { BoardEditorStore } from './board-editor.store';

const board: Board = { id: 'one', boardUrl: 'my-board', boardName: 'Mine', name: 'Old title', headline: 'Old', version: 7 };
const link: Widget = {
  id: 42, type: 'link', title: 'Social', layout: 'span-1', enabled: true, order: 0,
  config: { url: 'https://instagram.com/me', description: 'Hello', imageUrl: '/me.jpg', followersCount: 12 },
};

function setup() {
  const service = {
    getBoard: vi.fn(() => of(board)),
    getWidgets: vi.fn(() => of([link])),
    getBoardPermissions: vi.fn(() => of({ canEdit: true })),
    saveEditor: vi.fn(() => of<BoardEdit>({ board, widgets: [] })),
    deleteBoard: vi.fn(() => of(undefined)),
    getMyBoards: vi.fn(() => of([board])),
    getHomeAppearance: vi.fn(() => of(null)),
    getMyPreferences: vi.fn(() => of({ userId: 'a', username: 'a', mainBoardId: '', mainBoardUrl: '' })),
    getMyProfile: vi.fn(),
  };
  TestBed.configureTestingModule({ providers: [
    BoardEditorStore,
    { provide: BoardService, useValue: service },
    { provide: InsightsService, useValue: { recordView: () => of(undefined) } },
    { provide: AuthService, useValue: { user$: new BehaviorSubject<AuthUser | null>(null) } },
    { provide: ActivatedRoute, useValue: {
      paramMap: of(convertToParamMap({ boardId: 'my-board' })), data: of({}),
      snapshot: { paramMap: convertToParamMap({ boardId: 'my-board' }), data: {} },
    } },
  ] });
  const store = TestBed.inject(BoardEditorStore);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  store.startEdit(board, [link]);
  store.headline.set('New description');
  return { store, service, navigate };
}

describe('Board editor saving', () => {
  it('sends metadata, widgets, and the loaded revision in one request', () => {
    const { store, service } = setup();
    store.boardName.set('New title');
    store.addDraft('embed');
    store.saveEdit();
    expect(service.saveEditor).toHaveBeenCalledExactlyOnceWith('my-board', expect.objectContaining({
      version: 7, name: 'New title', headline: 'New description', ownerDisplayName: 'Old title',
      widgets: [expect.objectContaining({ id: 42, order: 0 }), expect.objectContaining({ type: 'embed', order: 1 })],
    }));
    expect(store.editing()).toBe(false);
  });

  it('saves the remaining widgets as the full list after a deletion', () => {
    const { store, service } = setup();
    store.deleteDraft(store.drafts()[0]);
    expect(store.hasUnsavedChanges()).toBe(true);
    store.saveEdit();
    expect(service.saveEditor).toHaveBeenCalledWith('my-board', expect.objectContaining({ widgets: [] }));
  });

  it('rejects blank metadata instead of silently skipping it', () => {
    const { store, service } = setup();
    store.boardName.set(' ');
    store.saveEdit();
    expect(service.saveEditor).not.toHaveBeenCalled();
    expect(store.widgetError()).toBe('Title and description are required.');
  });

  it('preserves drafts and displays a conflict without claiming success', () => {
    const { store, service } = setup();
    service.saveEditor.mockReturnValue(throwError(() => ({ status: 409, error: { message: 'Board changed in another tab.' } })));
    store.updateDraft(store.drafts()[0], { title: 'Kept' });
    store.saveEdit();
    expect(store.editing()).toBe(true);
    expect(store.drafts()[0].title).toBe('Kept');
    expect(store.widgetError()).toBe('Board changed in another tab.');
    expect(store.widgetsSaving()).toBe(false);
    expect(store.hasUnsavedChanges()).toBe(true);
  });

  it('highlights invalid URLs and clears the highlight once the field is edited', () => {
    const { store, service } = setup();
    store.updateDraft(store.drafts()[0], { linkUrl: 'javascript:alert(1)' });
    store.saveEdit();
    expect(service.saveEditor).not.toHaveBeenCalled();
    expect(store.draftError(store.drafts()[0])).toBe('Enter a valid HTTP or HTTPS URL.');
    store.updateDraft(store.drafts()[0], { linkUrl: 'example.com' });
    expect(store.draftError(store.drafts()[0])).toBe('');
    expect(store.widgetError()).toBe('');
  });

  it('saves a normalized website and rejects unsafe protocols', () => {
    const { store, service } = setup();
    store.website.set('google.com');
    store.saveEdit();
    expect(service.saveEditor).toHaveBeenLastCalledWith('my-board', expect.objectContaining({ website: 'https://google.com/' }));
    service.saveEditor.mockClear();
    store.startEdit(board, [link]);
    store.website.set('javascript:alert(1)');
    store.saveEdit();
    expect(service.saveEditor).not.toHaveBeenCalled();
  });

  it('treats a type change as unsaved and keeps link metadata when the change is reverted', () => {
    const { store, service } = setup();
    store.headline.set(board.headline);
    expect(store.hasUnsavedChanges()).toBe(false);
    store.changeDraftType(store.drafts()[0], 'map');
    expect(store.hasUnsavedChanges()).toBe(true);
    store.changeDraftType(store.drafts()[0], 'link');
    expect(store.hasUnsavedChanges()).toBe(false);
    store.saveEdit();
    expect(service.saveEditor).toHaveBeenCalledWith('my-board', expect.objectContaining({
      widgets: [expect.objectContaining({ type: 'link', config: link.config })],
    }));
  });
});

describe('Leaving and deleting boards', () => {
  it('blocks leaving while saving and asks before discarding drafts', () => {
    const { store, service } = setup();
    service.saveEditor.mockReturnValue(new Subject());
    store.saveEdit();
    expect(store.canLeave()).toBe(false);
    expect(store.widgetError()).toContain('Wait for the current operation');
    expect(store.blocksUnload()).toBe(true);
    store.cancelEdit();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(store.canLeave()).toBe(true);
    store.settings.name.set('Unsaved');
    expect(store.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });

  it('deletes the active board, refreshes the account and navigates to the fallback', () => {
    const { store, service, navigate } = setup();
    store.requestBoardDelete('my-board');
    store.confirmBoardDelete();
    expect(service.deleteBoard).toHaveBeenCalledWith('my-board');
    expect(TestBed.inject(BoardStoreService).notice()).toBe('Board "Mine" deleted.');
    expect(service.getMyBoards).toHaveBeenCalled();
    expect(service.getMyPreferences).toHaveBeenCalled();
    expect(store.editing()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('keeps the current route when deleting another board', () => {
    const { store, navigate } = setup();
    store.requestBoardDelete('other');
    store.confirmBoardDelete();
    expect(store.editing()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a failed delete without refreshing or navigating', () => {
    const { store, service, navigate } = setup();
    service.deleteBoard.mockReturnValue(throwError(() => ({ message: 'nope' })));
    store.requestBoardDelete('my-board');
    store.confirmBoardDelete();
    expect(store.deletingBoard()).toBe(false);
    expect(store.boardDeleteError()).toBe('Unable to delete board.');
    expect(store.accountActionError()).toBe('Unable to delete board.');
    expect(service.getMyBoards).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not refetch account data that the site theme service already loads', () => {
    const { service } = setup();
    expect(service.getMyBoards).not.toHaveBeenCalled();
    expect(service.getMyPreferences).not.toHaveBeenCalled();
    expect(TestBed.inject(UserStoreService).profile()).toBeNull();
  });
});
