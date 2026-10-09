import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';
import { BoardPageComponent } from './board-page';
import type { AuthUser } from '../../models/auth';
import type { Board, BoardEdit, BoardPermissions } from '../../models/board';

const owner: AuthUser = { id: 'alice', username: 'alice', displayName: 'Alice', email: null, role: 'USER' };
const board: Board = { id: 'one', boardUrl: 'one', boardName: 'One', name: 'Alice', headline: 'Private description', version: 1, visibility: 'private' };

function setup(readOnly = false, role = 'USER') {
  const user$ = new BehaviorSubject<AuthUser | null>({ ...owner, role });
  const params = new BehaviorSubject(convertToParamMap({ boardId: 'one' }));
  const service = {
    getBoard: vi.fn((_slug: string) => of(board)),
    getBoardForUsername: vi.fn((_username: string, _slug: string) => of(board)),
    getWidgets: vi.fn(() => of([])),
    getBoardPermissions: vi.fn((_slug: string) => of({ canEdit: true })),
    getEditor: vi.fn((_slug: string) => of<BoardEdit>({ board, widgets: [] })),
    saveEditor: vi.fn(), updateBoardIdentity: vi.fn(), deleteBoard: vi.fn(), createBoard: vi.fn(), updateMyPreferences: vi.fn(),
    getMyBoards: () => of([{ ...board, ownerUsername: 'alice' }, { ...board, id: 'two', boardUrl: 'two', boardName: 'Two', ownerUsername: 'alice' }]),
    getMyProfile: () => of({ userId: 'alice', username: 'alice', displayName: 'Alice', email: null }),
    getMyPreferences: () => of({ userId: 'alice', username: 'alice', mainBoardId: '', mainBoardUrl: '' }),
  };
  TestBed.configureTestingModule({ providers: [
    { provide: BoardService, useValue: service },
    { provide: AuthService, useValue: { user$, getAccessToken: () => '' } },
    { provide: ActivatedRoute, useValue: { paramMap: params, data: of({ readOnly }), snapshot: { data: { readOnly }, paramMap: params.value } } },
  ] });
  const fixture = TestBed.createComponent(BoardPageComponent);
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, service, params, user$ };
}

describe('Board permissions across navigation and sessions', () => {
  it.each(['save', 'cancel'])('keeps the board mounted while %s refreshes the view', action => {
    const { page, fixture, service } = setup();
    const profile = fixture.nativeElement.querySelector('app-board-profile');
    page.startWidgetEdit(board, []);
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    const refresh = new Subject<Board>();
    service.getBoard.mockReturnValue(refresh);
    service.saveEditor.mockReturnValue(of({ board, widgets: [] }));
    if (action === 'save') page.doneWidgetEdit();
    else page.discardWidgetEdit();
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(page.isWidgetEditMode).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBe(profile);
    expect(fixture.nativeElement.textContent).not.toContain('Loading');
    refresh.next({ ...board, headline: 'Refreshed description' });
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBe(profile);
    expect(fixture.nativeElement.textContent).toContain('Refreshed description');
  });

  it('revokes editing and hides old content immediately while another board loads', () => {
    const { page, fixture, service, params } = setup();
    expect(page.canEditBoard).toBe(true);
    const nextBoard = new Subject<Board>();
    const permissions = new Subject<BoardPermissions>();
    service.getBoard.mockReturnValue(nextBoard);
    service.getBoardPermissions.mockReturnValue(permissions);
    params.next(convertToParamMap({ boardId: 'two' })); fixture.detectChanges();
    expect(page.canEditBoard).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBeNull();
    nextBoard.next({ ...board, id: 'two', boardUrl: 'two', visibility: 'public' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).toBeNull();
    page.requestWidgetEdit(board); page.saveIdentity();
    expect(service.getEditor).not.toHaveBeenCalled();
    expect(service.updateBoardIdentity).not.toHaveBeenCalled();
    permissions.error(new Error('unavailable')); fixture.detectChanges();
    expect(page.canEditBoard).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-settings')).toBeNull();
  });

  it('ignores a permission response belonging to the previous board', () => {
    const { page, service, params } = setup();
    const old = new Subject<BoardPermissions>();
    service.getBoardPermissions.mockReturnValue(old);
    params.next(convertToParamMap({ boardId: 'pending' }));
    service.getBoardPermissions.mockReturnValue(of({ canEdit: false }));
    params.next(convertToParamMap({ boardId: 'visitor' }));
    expect(old.observed).toBe(false);
    old.next({ canEdit: true });
    expect(page.canEditBoard).toBe(false);
  });

  it('revokes editing before an owner-qualified board URL finishes resolving', () => {
    const { page, fixture, service, params } = setup();
    const resolving = new Subject<Board>();
    service.getBoardForUsername.mockReturnValue(resolving);
    params.next(convertToParamMap({ username: 'bob', boardId: 'two' })); fixture.detectChanges();
    expect(page.canEditBoard).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-settings')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBeNull();
  });

  it('clears private drafts and cancels pending editor reads on sign-out', () => {
    const { page, fixture, service, user$ } = setup();
    page.startWidgetEdit(board, []);
    page.boardDraftHeadline = 'Unsaved private text';
    service.getBoard.mockReturnValue(throwError(() => ({ status: 404 })));
    user$.next(null); fixture.detectChanges();
    expect(page.canEditBoard).toBe(false);
    expect(page.isWidgetEditMode).toBe(false);
    expect(page.boardDraftHeadline).toBe('');
    expect(page.widgetDrafts).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('Private description');
    expect(fixture.nativeElement.textContent).toContain('Board not found');

    service.getBoard.mockReturnValue(of(board));
    user$.next(owner); fixture.detectChanges();
    const editor = new Subject<BoardEdit>();
    service.getEditor.mockReturnValue(editor);
    page.requestWidgetEdit(board);
    user$.next(null);
    expect(editor.observed).toBe(false);
    editor.next({ board, widgets: [] });
    expect(page.isWidgetEditMode).toBe(false);
  });

  it('keeps the public main-board view read-only even with server edit permission', () => {
    const { page, fixture, service } = setup(true);
    expect(page.canEditBoard).toBe(true);
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-board-settings')).toBeNull();
    page.requestWidgetEdit(board); page.startWidgetEdit(board, []); page.saveIdentity(); page.doneWidgetEdit();
    expect(page.isWidgetEditMode).toBe(false);
    expect(service.getEditor).not.toHaveBeenCalled();
    expect(service.saveEditor).not.toHaveBeenCalled();
    expect(service.updateBoardIdentity).not.toHaveBeenCalled();
  });

  it.each(['create', 'delete', 'main'])('ignores a pending %s result after the account changes', action => {
    const { page, service, user$ } = setup();
    const response = new Subject<any>();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    if (action === 'create') {
      service.createBoard.mockReturnValue(response); page.createNewBoard();
    } else if (action === 'delete') {
      service.deleteBoard.mockReturnValue(response);
      page.onAccountBoardDelete('one', new MouseEvent('click')); page.confirmBoardDelete();
    } else {
      service.updateMyPreferences.mockReturnValue(response);
      page.onAccountBoardSetMain('two', new MouseEvent('click'));
    }
    expect(response.observed).toBe(true);
    user$.next(null);
    expect(response.observed).toBe(false);
    response.next({ ...board, mainBoardId: 'two' }); response.complete();
    expect(navigate).not.toHaveBeenCalled();
    expect(page.accountMainBoardId).toBe('');
    expect(page.isCreatingBoard || page.isDeletingBoard || page.isSettingMainBoard).toBe(false);
  });

  it('uses the server permission for admin editing and marks only the active board', () => {
    const { page, fixture } = setup(false, 'ADMIN');
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).not.toBeNull();
    page.toggleBoardIdentityMenu(); page.toggleBoardSwitcher(); fixture.changeDetectorRef.markForCheck(); fixture.detectChanges();
    const active = fixture.nativeElement.querySelectorAll('.board-switcher-link[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain('One');
  });
});
