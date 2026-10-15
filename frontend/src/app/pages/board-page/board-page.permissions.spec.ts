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
    getHomeAppearance: () => of(null), getMyPreferences: () => of({ userId: 'alice', username: 'alice', mainBoardId: '', mainBoardUrl: '' }),
  };
  TestBed.configureTestingModule({ providers: [
    { provide: BoardService, useValue: service },
    { provide: AuthService, useValue: { user$, getAccessToken: () => '' } },
    { provide: ActivatedRoute, useValue: { paramMap: params, data: of({ readOnly }), snapshot: { data: { readOnly }, paramMap: params.value } } },
  ] });
  const fixture = TestBed.createComponent(BoardPageComponent);
  fixture.detectChanges();
  const page = fixture.componentInstance;
  return { fixture, page, store: page.store, service, params, user$ };
}

describe('Board permissions across navigation and sessions', () => {
  it('uses the owner-qualified board response once for both page and widget loading', () => {
    const { fixture, service, params } = setup();
    params.next(convertToParamMap({ username: 'alice', boardId: 'one' }));
    fixture.detectChanges();
    expect(service.getBoardForUsername).toHaveBeenCalledExactlyOnceWith('alice', 'one');
    expect(service.getBoard).toHaveBeenCalledTimes(1); // Only the initial legacy route.
    expect(service.getWidgets).toHaveBeenCalledTimes(2); // Once per context.
  });

  it('renders a retryable server failure and recovers through its Retry button', () => {
    const { fixture, service, params } = setup();
    service.getBoard.mockReturnValue(throwError(() => ({ status: 503 })));
    params.next(convertToParamMap({ boardId: 'one' })); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load this board');
    expect(fixture.nativeElement.textContent).not.toContain('Board not found');
    service.getBoard.mockReturnValue(of(board));
    const root: HTMLElement = fixture.nativeElement;
    Array.from(root.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Retry')!
      .dispatchEvent(new MouseEvent('click'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-board-profile')).not.toBeNull();
  });

  it('shows widget load errors separately from a successful empty board', () => {
    const { fixture, service, params } = setup();
    service.getWidgets.mockReturnValue(throwError(() => ({ status: 500 })));
    params.next(convertToParamMap({ boardId: 'one' })); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to load widgets');
    expect(fixture.nativeElement.textContent).not.toContain('No widgets configured yet');
  });

  it.each(['save', 'cancel'])('keeps the board mounted while %s refreshes the view', action => {
    const { store, fixture, service } = setup();
    const profile = fixture.nativeElement.querySelector('app-board-profile');
    store.startEdit(board, []);
    fixture.detectChanges();
    const refresh = new Subject<Board>();
    service.getBoard.mockReturnValue(refresh);
    service.saveEditor.mockReturnValue(of({ board, widgets: [] }));
    if (action === 'save') store.saveEdit();
    else store.discardEdit();
    fixture.detectChanges();
    expect(store.editing()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBe(profile);
    expect(fixture.nativeElement.textContent).not.toContain('Loading');
    refresh.next({ ...board, headline: 'Refreshed description' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBe(profile);
    expect(fixture.nativeElement.textContent).toContain('Refreshed description');
  });

  it('revokes editing and hides old content immediately while another board loads', () => {
    const { store, fixture, service, params } = setup();
    expect(store.canEdit()).toBe(true);
    const nextBoard = new Subject<Board>();
    const permissions = new Subject<BoardPermissions>();
    service.getBoard.mockReturnValue(nextBoard);
    service.getBoardPermissions.mockReturnValue(permissions);
    params.next(convertToParamMap({ boardId: 'two' })); fixture.detectChanges();
    expect(store.canEdit()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBeNull();
    nextBoard.next({ ...board, id: 'two', boardUrl: 'two', visibility: 'public' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).toBeNull();
    store.requestEdit(board); store.settings.name.set('Renamed'); store.saveSettings();
    expect(service.getEditor).not.toHaveBeenCalled();
    expect(service.updateBoardIdentity).not.toHaveBeenCalled();
    permissions.error(new Error('unavailable')); fixture.detectChanges();
    expect(store.canEdit()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-settings')).toBeNull();
  });

  it('ignores a permission response belonging to the previous board', () => {
    const { store, service, params } = setup();
    const old = new Subject<BoardPermissions>();
    service.getBoardPermissions.mockReturnValue(old);
    params.next(convertToParamMap({ boardId: 'pending' }));
    service.getBoardPermissions.mockReturnValue(of({ canEdit: false }));
    params.next(convertToParamMap({ boardId: 'visitor' }));
    expect(old.observed).toBe(false);
    old.next({ canEdit: true });
    expect(store.canEdit()).toBe(false);
  });

  it('revokes editing before an owner-qualified board URL finishes resolving', () => {
    const { store, fixture, service, params } = setup();
    const resolving = new Subject<Board>();
    service.getBoardForUsername.mockReturnValue(resolving);
    params.next(convertToParamMap({ username: 'bob', boardId: 'two' })); fixture.detectChanges();
    expect(store.canEdit()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-board-settings')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-board-profile')).toBeNull();
  });

  it('clears private drafts and cancels pending editor reads on sign-out', () => {
    const { store, fixture, service, user$ } = setup();
    store.startEdit(board, []);
    store.headline.set('Unsaved private text');
    service.getBoard.mockReturnValue(throwError(() => ({ status: 404 })));
    user$.next(null); fixture.detectChanges();
    expect(store.canEdit()).toBe(false);
    expect(store.editing()).toBe(false);
    expect(store.headline()).toBe('');
    expect(store.drafts()).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('Private description');
    expect(fixture.nativeElement.textContent).toContain('Board not found');

    service.getBoard.mockReturnValue(of(board));
    user$.next(owner); fixture.detectChanges();
    const editor = new Subject<BoardEdit>();
    service.getEditor.mockReturnValue(editor);
    store.requestEdit(board);
    user$.next(null);
    expect(editor.observed).toBe(false);
    editor.next({ board, widgets: [] });
    expect(store.editing()).toBe(false);
  });

  it('lets the owner edit widgets and settings from the main-board view', () => {
    const { store, fixture, service } = setup(true);
    expect(store.canEdit()).toBe(true);
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-board-settings')).not.toBeNull();
    store.requestEdit(board);
    expect(service.getEditor).toHaveBeenCalled();
    store.cancelEdit();
    service.updateBoardIdentity.mockReturnValue(of({ ...board, boardName: 'Renamed', version: 2 }));
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    store.settings.name.set('Renamed');
    store.saveSettings();
    expect(service.updateBoardIdentity).toHaveBeenCalledWith('one', expect.objectContaining({ boardName: 'Renamed' }));
    expect(store.settings.savedName()).toBe('Renamed');
  });

  it.each(['delete', 'main'])('ignores a pending %s result after the account changes', action => {
    const { store, service, user$ } = setup();
    const response = new Subject<any>();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    if (action === 'delete') {
      service.deleteBoard.mockReturnValue(response);
      store.requestBoardDelete('one'); store.confirmBoardDelete();
    } else {
      service.updateMyPreferences.mockReturnValue(response);
      store.setMainBoard('two');
    }
    expect(response.observed).toBe(true);
    user$.next(null);
    expect(response.observed).toBe(false);
    response.next({ ...board, mainBoardId: 'two' }); response.complete();
    expect(navigate).not.toHaveBeenCalled();
    expect(store.mainBoardId()).toBe('');
    expect(store.deletingBoard() || store.settingMainBoard()).toBe(false);
  });

  it('uses the server permission for admin editing and marks only the active board', () => {
    const { page, fixture } = setup(false, 'ADMIN');
    expect(fixture.nativeElement.querySelector('.profile-edit-actions')).not.toBeNull();
    page.toggleBoardIdentityMenu(); page.store.toggleSwitcher(); fixture.detectChanges();
    const active = fixture.nativeElement.querySelectorAll('.board-switcher-link[aria-current="page"]');
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain('One');
  });
});
