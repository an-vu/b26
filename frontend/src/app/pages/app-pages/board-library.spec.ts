import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BoardLibraryComponent } from './board-library';
import { BoardService } from '../../services/board.service';
import { BoardStoreService } from '../../services/board-store.service';
import { UserStoreService } from '../../services/user-store.service';
import { Board, UserProfile } from '../../models/board';

const board: Board = { id: 'a', boardUrl: 'first', boardName: 'First', name: '', headline: '', version: 3, visibility: 'private' };
function setup(mainId = '') {
  const profile$ = new BehaviorSubject<UserProfile | null>({userId: 'alice', username: 'alice', displayName: 'Alice', email: null});
  const service = {
    getMyBoards: vi.fn(() => of([board])), getMyPreferences: vi.fn(() => of({mainBoardId: mainId})),
    updateBoardVisibility: vi.fn(() => of({...board, visibility: 'public'})),
    updateMyPreferences: vi.fn(() => of({mainBoardId: 'a'})),
  };
  TestBed.configureTestingModule({providers: [
    {provide: BoardService, useValue: service}, {provide: Router, useValue: {}},
    {provide: BoardStoreService, useValue: {refreshBoards: vi.fn()}},
    {provide: UserStoreService, useValue: {setMainBoardId: vi.fn(), profile$}},
  ]});
  return {service, profile$, fixture: TestBed.createComponent(BoardLibraryComponent)};
}
describe('Board visibility and public main selection', () => {
  it('refreshes owner-qualified board links after the account username changes', () => {
    const {service, profile$, fixture} = setup();
    service.getMyBoards.mockReturnValue(of([{ ...board, ownerUsername: 'new-name' }]));
    profile$.next({ ...profile$.value!, username: 'new-name' });
    expect(service.getMyBoards).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.boardRoute(fixture.componentInstance.boards[0])).toBe('/new-name/first');
  });
  it('clears old boards immediately when the account changes and ignores pending responses', () => {
    const {service, profile$, fixture} = setup('a');
    expect(fixture.componentInstance.boards).toEqual([board]);
    const oldBoards = new Subject<Board[]>();
    service.getMyBoards.mockReturnValue(oldBoards);
    fixture.componentInstance.refresh();
    profile$.next(null);
    expect(oldBoards.observed).toBe(false);
    oldBoards.next([board]); oldBoards.complete();
    expect(fixture.componentInstance.boards).toEqual([]);
    expect(fixture.componentInstance.mainId).toBe('');
    expect(fixture.componentInstance.signedIn).toBe(false);
    fixture.componentInstance.changeVisibility(board);
    expect(service.updateBoardVisibility).not.toHaveBeenCalled();
  });

  it('shows a retryable load error without keeping old board controls', () => {
    const {service, fixture} = setup();
    service.getMyBoards.mockReturnValue(throwError(() => new Error('offline')));
    fixture.componentInstance.refresh();
    fixture.detectChanges();
    expect(fixture.componentInstance.boards).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Unable to load your boards');
    expect(fixture.nativeElement.textContent).toContain('Retry loading boards');
    expect(fixture.nativeElement.textContent).not.toContain('Sign in to manage');
  });

  it('requires explicit confirmation before publishing a private main board', () => {
    const {service, fixture} = setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fixture.componentInstance.setMain(board);
    expect(service.updateBoardVisibility).not.toHaveBeenCalled();
    expect(service.updateMyPreferences).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fixture.componentInstance.setMain(board);
    expect(service.updateBoardVisibility).toHaveBeenCalledWith('first', 'public', 3);
    expect(service.updateMyPreferences).toHaveBeenCalledWith({mainBoardId: 'a'});
    confirm.mockRestore();
  });
  it('waits for main removal before making the board private', () => {
    const {service, fixture} = setup('a');
    const removed = new Subject<any>();
    service.updateMyPreferences.mockReturnValue(removed);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.changeVisibility({...board, visibility: 'public'});
    expect(service.updateMyPreferences).toHaveBeenCalledWith({mainBoardId: ''});
    expect(service.updateBoardVisibility).not.toHaveBeenCalled();
    removed.next({mainBoardId: ''}); removed.complete();
    expect(service.updateBoardVisibility).toHaveBeenCalledWith('first', 'private', 3);
    confirm.mockRestore();
  });
});
